/**
 * Transaction process graph for extra payments:
 *   - a technician asks the company for an extra amount on a job that is
 *     already paid for
 *   - the company pays it, or declines it
 *
 * Each request is its own transaction on the same listing. The job it belongs
 * to is in protectedData.parentTxId, which is what links the two together in
 * the UI and in the notification emails.
 *
 * Keep this in sync with ext/transaction-processes/extra-payment/process.edn
 */

/**
 * Transitions
 *
 * These strings must sync with the process definition in the backend.
 */
export const transitions = {
  // The technician names the amount and the reason
  REQUEST_EXTRA_PAYMENT: 'transition/request-extra-payment',

  // The company opens the payment modal, which creates the payment intent
  INITIATE_PAYMENT: 'transition/initiate-payment',

  // The card has been confirmed in the browser
  CONFIRM_PAYMENT: 'transition/confirm-payment',

  // The push counterparts, for iDEAL. They run through the same states as the
  // card pair; only the confirm differs in who makes it - the operator, from
  // the Stripe webhook, because the browser leaves the page for the bank.
  INITIATE_PUSH_PAYMENT: 'transition/initiate-push-payment',
  CONFIRM_PUSH_PAYMENT: 'transition/confirm-push-payment',

  // The request is turned down, taken back, or left unanswered
  DECLINE: 'transition/decline',
  WITHDRAW: 'transition/withdraw',
  OPERATOR_DECLINE: 'transition/operator-decline',
  EXPIRE: 'transition/expire',
  EXPIRE_PAYMENT: 'transition/expire-payment',
};

/**
 * States
 *
 * These constants are only used in the state machine below.
 */
export const states = {
  INITIAL: 'initial',
  PAYMENT_REQUESTED: 'payment-requested',
  PENDING_CONFIRMATION: 'pending-confirmation',
  PAID: 'paid',
  DECLINED: 'declined',
  EXPIRED: 'expired',
};

/**
 * Description of the transaction process graph
 */
export const graph = {
  id: 'extra-payment/release-1',
  initial: states.INITIAL,
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.REQUEST_EXTRA_PAYMENT]: states.PAYMENT_REQUESTED,
      },
    },
    [states.PAYMENT_REQUESTED]: {
      on: {
        [transitions.INITIATE_PAYMENT]: states.PENDING_CONFIRMATION,
        [transitions.INITIATE_PUSH_PAYMENT]: states.PENDING_CONFIRMATION,
        [transitions.DECLINE]: states.DECLINED,
        [transitions.WITHDRAW]: states.DECLINED,
        [transitions.OPERATOR_DECLINE]: states.DECLINED,
        [transitions.EXPIRE]: states.EXPIRED,
      },
    },
    [states.PENDING_CONFIRMATION]: {
      on: {
        [transitions.CONFIRM_PAYMENT]: states.PAID,
        [transitions.CONFIRM_PUSH_PAYMENT]: states.PAID,
        [transitions.EXPIRE_PAYMENT]: states.EXPIRED,
      },
    },
    [states.PAID]: { type: 'final' },
    [states.DECLINED]: { type: 'final' },
    [states.EXPIRED]: { type: 'final' },
  },
};

/**
 * What Stripe charges to process the card payment. It is withheld from the
 * technician's payout as a 'line-item/stripe-fee' line item - it is not the
 * marketplace's commission, which doesn't apply to extra payments at all.
 *
 * Note: keep in sync with STRIPE_FEE_PERCENTAGE in server/api-util/negotiation.js,
 * which is what actually builds the line item.
 */
export const STRIPE_FEE_PERCENTAGE = 3.2;

/**
 * Splits an extra payment amount into the fee and what is left for the
 * technician, for showing the breakdown before the request is sent.
 *
 * @param {Money} amount the amount being asked for
 * @returns {Object|null} { fee, payout } as Money, or null without an amount
 */
export const splitExtraPaymentAmount = amount => {
  if (!amount || typeof amount.amount !== 'number') {
    return null;
  }

  const feeInSubunits = Math.round((amount.amount * STRIPE_FEE_PERCENTAGE) / 100);

  return {
    feeInSubunits,
    payoutInSubunits: amount.amount - feeInSubunits,
    currency: amount.currency,
  };
};

// The transitions that mean the payment went through, whichever way it was paid
const paidTransitions = [transitions.CONFIRM_PAYMENT, transitions.CONFIRM_PUSH_PAYMENT];

// The transitions that leave the request open for the company to act on
const payableTransitions = [
  transitions.REQUEST_EXTRA_PAYMENT,
  transitions.INITIATE_PAYMENT,
  transitions.INITIATE_PUSH_PAYMENT,
];

// Check if a transition is the kind that moves money
export const isRelevantPastTransition = transition => {
  return [
    transitions.REQUEST_EXTRA_PAYMENT,
    transitions.CONFIRM_PAYMENT,
    transitions.CONFIRM_PUSH_PAYMENT,
    transitions.DECLINE,
    transitions.WITHDRAW,
    transitions.OPERATOR_DECLINE,
  ].includes(transition);
};

// Requests that are still waiting for the company to act
export const isPending = lastTransition => payableTransitions.includes(lastTransition);

// Requests that have been paid
export const isPaid = lastTransition => paidTransitions.includes(lastTransition);

// Whether the company can still pay this request. A push payment that was
// started but never confirmed is included: the customer has to be able to come
// back and finish it.
export const isPayable = lastTransition => payableTransitions.includes(lastTransition);

// This process has no reviews
export const isCustomerReview = () => false;
export const isProviderReview = () => false;
export const isPrivileged = transition => [transitions.REQUEST_EXTRA_PAYMENT].includes(transition);
export const isCompleted = lastTransition => paidTransitions.includes(lastTransition);

// Nothing in this process refunds: a card in pending-confirmation holds an
// uncaptured authorization, and a push payment can only ever move forward to
// paid.
export const isRefunded = () => false;
export const statesNeedingProviderAttention = [];
