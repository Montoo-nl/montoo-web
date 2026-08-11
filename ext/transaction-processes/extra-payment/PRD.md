# Extra payment

A technician who has already been paid for a job can ask the company for an
extra amount — unforeseen work, extra materials, a longer day than quoted. The
company reviews the request on the job's transaction page and pays it there.

Status: **built and deployed to `montoo-dev`** as `extra-payment/release-1`.
Not yet deployed to production.

---

## 1. Why it looks the way it does

An extra payment is **its own transaction**, on its own process, against the
same listing as the job. It is not a transition on the job's transaction.

The reason is money: Sharetribe computes `payinTotal` / `payoutTotal` per
transaction from its line items, and captures once. Adding money to a
transaction that has already been captured and paid out isn't something the
platform supports. A second transaction is the supported way to move a second
amount.

The two are linked in both directions, because neither direction alone is
enough:

| Direction | Where | Why |
|---|---|---|
| child → parent | `protectedData.parentTxId` on the child | so the notification email can deep-link to the job |
| parent → child | `metadata.extraPayments: [childId]` on the parent | so the job page can find its requests — **the Marketplace API cannot filter on `protectedData`**, so the child→parent link is not queryable |

`metadata` is operator-only, so writing it needs the Integration API. That is
what `server/api/link-extra-payment.js` exists for.

---

## 2. The process

`process.edn` in this directory. States and transitions:

```
                    request-extra-payment (provider, privileged)
  [initial] ─────────────────────────────────────► payment-requested
                                                          │
                    initiate-payment (customer)           │
                  ┌───────────────────────────────────────┤
                  ▼                                       │
          pending-confirmation                            │
                  │                                       │
   confirm-payment│(customer)          decline (customer) │
                  ▼                    withdraw (provider)│
               [paid]                  operator-decline   │
                                                          ▼
   expire-payment (P7D) ─────► [expired]  ◄──── expire (P7D)
                                              [declined]
```

**Why payment-intent creation is its own transition.** `initiate-payment` is
separate from `request-extra-payment` so the Stripe payment intent is created
at the moment the company opens the modal, not when the technician submits.
This mirrors the reference `automatic-off-session-payment` process, and it
means an unanswered request never leaves a dangling intent.

**Why capture and payout are in one transition.** `confirm-payment` runs
`stripe-confirm-payment-intent`, `stripe-capture-payment-intent` and
`stripe-create-payout` together. The work is already done — there is no
delivery step to wait for, so the technician is paid immediately.

### Notifications

| Template | On | To |
|---|---|---|
| `extra-payment-requested` | `request-extra-payment` | customer |
| `extra-payment-paid` | `confirm-payment` | provider |
| `extra-payment-declined` | `decline` | provider |

`extra-payment-requested` carries the amount, the reason, and a CTA to
`{{marketplace.url}}/order/{{url-encode protected-data.parentTxId}}` — i.e. the
**job**, not the request, since that is where the company acts on it.

---

## 3. Money

An extra payment carries **no marketplace commission**. The only deduction is
the card fee, as its own line item, so the marketplace doesn't pay Stripe out
of its own pocket.

For a €100 request:

| Line item | Customer | Provider |
|---|---|---|
| `line-item/request` | €100.00 | €100.00 |
| `line-item/stripe-fee` (−3.2%) | — | −€3.20 |
| **Total** | **pays €100.00** | **receives €96.80** |

Both live in `server/api-util/negotiation.js`:

- `getExtraPaymentCommissions()` → `{ providerCommission: null, customerCommission: null }`
- `getExtraPaymentStripeFeeLineItem(amount)` → the `line-item/stripe-fee` item
- `STRIPE_FEE_PERCENTAGE = 3.2`

`initiate-privileged.js` applies both only when
`isIntentionToRequestExtraPayment(offerInSubunits, transition)` matches, so
normal offers are untouched.

> ⚠️ **`STRIPE_FEE_PERCENTAGE` is duplicated on the client**, in
> `src/transactions/transactionProcessExtraPayment.js`, purely to preview the
> payout in the request modal. The client can't import from `server/`. **Change
> both**, or the technician is quoted a payout that doesn't match reality.
> Displays that read from a finished transaction use `payoutTotal` instead and
> are immune to this.

`line-item/stripe-fee` is not a code `OrderBreakdown` recognises, so it renders
via `LineItemUnknownItemsMaybe` using the raw code as its label. Giving it a
proper label is an open item.

---

## 4. Flow

**Technician requests**

1. `ActionButtons` shows "Request extra pay" when the user is the provider, the
   job has a `transition/confirm-payment` in its history, and no extra payment
   exists yet.
2. `RequestExtraPaymentModal` takes an amount and a reason. The reason is run
   through `util/contentFilter` on submit — contact details and payment methods
   are blocked here as everywhere else. A live breakdown shows the payout after
   the card fee.
3. `requestExtraPayment` (TransactionPage.duck) → `initiatePrivileged` →
   creates the child transaction with `protectedData: { parentTxId, extraPaymentReason }`.
4. `linkExtraPayment` writes the child id into the job's `metadata.extraPayments`.
   If this fails the request still stands — it just won't be found by the job
   page — and it logs `link-extra-payment-failed`.

**Company pays**

1. `fetchTransaction` reads `metadata.extraPayments` and fetches those
   transactions **before the page resolves**, so the buttons don't appear late.
2. `ActionButtons` shows "Review extra pay request (€X)".
3. `ExtraPaymentModal` handles both card cases: a saved card is charged with one
   button; without one, the Stripe card form is rendered inline via
   `EnhancedPaymentMethodsForm` so no trip to the payment methods page is needed.
4. Pay → `initiate-payment` → `confirmCardPayment` → `confirm-payment`.
   Decline → `decline`.
5. `onExtraPaymentUpdated` refetches the transaction so the buttons update.

---

## 5. The listing-closed problem

**This is the most surprising part of the feature. Read before touching
`award-job.js`.**

`server/api/award-job.js` closes the listing when a job is paid for, so it stops
taking new offers. But the Marketplace API **refuses to initiate a transaction
against a closed listing** — it returns `409 transaction-listing-not-found`.
An extra payment is always requested after that point, so it was permanently
broken.

There was no way around it from the operator side: **the Integration SDK has no
`initiate` method at all** (`query, show, transition, transitionSpeculative,
updateMetadata`).

The resolution, in `initiate-privileged.js`, scoped to extra payments only:

1. the listing is already fetched there, so its `state` is checked for free
2. if closed → `listings.open()` via the Integration SDK, remembering the id
3. initiate with the trusted SDK as normal
4. `recloseListingMaybe()` runs on **both the success and the error path**

`listingToReclose` is only set when *we* opened it, so a job that was already
open is left alone. During the ~1s window the job is open, `/api/offer-availability`
still reports `jobTaken` (the parent has a `confirm-payment`), so no offer can
slip in.

---

## 6. Files

### Created

| File | What |
|---|---|
| `ext/transaction-processes/extra-payment/process.edn` | the process |
| `ext/transaction-processes/extra-payment/templates/…` | 3 email templates (subject + html each) |
| `src/transactions/transactionProcessExtraPayment.js` | client-side graph, transitions, `isPayable` / `isPaid`, `STRIPE_FEE_PERCENTAGE`, `splitExtraPaymentAmount` |
| `server/api/link-extra-payment.js` | writes the child id into the job's metadata (Integration SDK) |
| `src/containers/TransactionPage/RequestExtraPaymentModal/` | technician's amount + reason modal |
| `src/containers/TransactionPage/ExtraPaymentModal/` | company's review + pay modal |

### Modified

| File | Change |
|---|---|
| `src/transactions/transaction.js` | registers the process, `EXTRA_PAYMENT_PROCESS_NAME`, `isExtraPaymentProcess()` |
| `server/api-util/negotiation.js` | `REQUEST_EXTRA_PAYMENT`, `isIntentionToRequestExtraPayment`, commissions + stripe fee line item |
| `server/api/initiate-privileged.js` | extra-payment commissions, fee line item, open/reclose the listing |
| `server/apiRouter.js` | `POST /api/link-extra-payment` |
| `src/util/api.js` | `linkExtraPayment` client helper |
| `src/containers/TransactionPage/TransactionPage.duck.js` | `requestExtraPayment`, `fetchExtraPayments`, `extraPaymentTxs` state, fetch children during `fetchTransaction` |
| `src/containers/TransactionPage/TransactionPage.js` | passes `extraPaymentTxs`, submit handler, refresh callback, `showExtraPaymentActions` |
| `src/containers/TransactionPage/ActionButtons/ActionButtons.js` | owns the buttons, both modals, and all extra-payment state |
| `src/containers/TransactionPage/TransactionPanel/TransactionPanel.js` | renders action buttons when `showExtraPaymentActions` too |
| `src/translations/en.json` | `ActionButtons.extraPayment*`, `RequestExtraPayment*`, `ExtraPaymentModal.*` |

---

## 7. Gotchas that cost time

Each of these produced a real bug during the build:

1. **`TransactionPanel` gates `actionButtons(...)` on `stateData.showActionButtons`.**
   A paid job has no process actions left, so `ActionButtons` was never called
   and nothing rendered. Hence the `showExtraPaymentActions` prop.

2. **The two SDKs have different `UUID` types.** Passing a Marketplace SDK UUID
   to the Integration SDK fails with
   `Don't know how to serialize query parameter 'id'`. See `toIntegrationUUID`
   in `initiate-privileged.js`.

3. **`makeTransition` resolves the process from the entity store**, not from the
   transaction object handed to it. Child transactions must be pushed through
   `addMarketplaceEntities`, or transitioning one throws
   `Unknown transaction process name: undefined`.

4. **`extraPaymentTxs` is a snapshot**, not derived from the entity store, so
   anything that transitions a child must trigger a refetch
   (`onExtraPaymentUpdated`). The durable fix is to store refs and denormalise
   in the selector, the way `transactionRef` already works.

5. **`getCurrencyFormatting()` throws without a currency.** `TransactionPage`
   passes `currencyConfig={null}` when the listing has no price of its own,
   which is always true for negotiation jobs.

6. **The saved card is not on `currentUser`** until `stripeCustomer()` resolves,
   so the modal flashed the card form before the pay button. Hence
   `isLoadingCard`, which starts `true`.

---

## 8. Deploying

Already run against `montoo-dev`:

```bash
flex-cli process create --path ext/transaction-processes/extra-payment \
  --process extra-payment -m montoo-dev
flex-cli process create-alias --process extra-payment --version 1 \
  --alias release-1 -m montoo-dev
```

For a new environment, or after editing `process.edn`:

```bash
# new version of an existing process
flex-cli process push --path ext/transaction-processes/extra-payment \
  --process extra-payment -m <marketplace>

# point the alias at it
flex-cli process update-alias --process extra-payment --version <n> \
  --alias release-1 -m <marketplace>
```

The client alias is hardcoded as `extra-payment/release-1` in
`transactionProcessExtraPayment.js` (`graph.id`) and in
`TransactionPage.duck.js` (`requestExtraPayment`).

---

## 9. Open items

- **One extra payment per job.** `extraPaymentTxs[0]` is treated as the only
  one, and the request button hides once it exists. Allowing several means
  rendering a list in `ActionButtons` and dropping that guard.
- **`line-item/stripe-fee` has no label** in `OrderBreakdown`.
- **`link-extra-payment` trusts `middleware.auth` plus a provider check.** It
  verifies the caller is the job's provider. `award-job` and
  `close-listing`-style endpoints do *not* check party membership — worth a pass.
- **Email templates are English-only** and not yet in `email-texts.json`; they
  fall back to the inline defaults.
- **No tests.** Per project convention (see `MEMORY.md`), tests are not written
  for this project.
