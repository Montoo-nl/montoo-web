// default-negotiation process: transitions that make the first offer
const sharetribeSdk = require('sharetribe-flex-sdk');

const { Money } = sharetribeSdk.types;

const makeOfferTransitions = [
  'transition/make-offer',
  'transition/make-offer-after-inquiry',
  'transition/make-offer-from-request',
];

// default-negotiation process: transitions that update the offer
const updateOfferTransitions = ['transition/update-offer', 'transition/update-from-update-pending'];

// default-negotiation process: transitions that make a counter offer
const counterOfferTransitions = [
  'transition/customer-make-counter-offer',
  'transition/provider-make-counter-offer',
];

// default-negotiation process: transitions that revoke a counter offer
const revokeCounterOfferTransitions = [
  'transition/customer-withdraw-counter-offer',
  'transition/provider-reject-counter-offer',
];

// default-negotiation process: transitions that affect pricing on negotiation loop
const offerTransitionsInNegotiationProcess = [
  ...makeOfferTransitions,
  ...updateOfferTransitions,
  ...counterOfferTransitions,
  ...revokeCounterOfferTransitions,
];

// An offer is on the table while the transaction's last transition is one of
// these. A rejected or withdrawn offer moves on to another transition, so it
// stops counting by itself.
const pendingOfferTransitions = makeOfferTransitions;
exports.pendingOfferTransitions = pendingOfferTransitions;

// Lets the operator take a pending offer off the table, e.g. when the job has
// gone to someone else.
const OPERATOR_REJECT_OFFER = 'transition/operator-reject-offer';
exports.OPERATOR_REJECT_OFFER = OPERATOR_REJECT_OFFER;

// extra-payment process: the technician names an amount for work that wasn't in
// the original job. Like a make-offer transition, the amount comes from the
// request rather than from the listing, so line items have to be set from it.
const REQUEST_EXTRA_PAYMENT = 'transition/request-extra-payment';
exports.REQUEST_EXTRA_PAYMENT = REQUEST_EXTRA_PAYMENT;

/**
 * Checks if the transition asks for an extra payment with an amount above 0.
 *
 * @param {number} offerInSubunits
 * @param {string} transitionName
 * @returns {boolean}
 */
exports.isIntentionToRequestExtraPayment = (offerInSubunits, transitionName) => {
  return transitionName === REQUEST_EXTRA_PAYMENT && offerInSubunits > 0;
};

// What Stripe charges to process a card payment. Withheld from the technician's
// payout so the marketplace isn't paying the card fee itself.
//
// Note: the line item is set when the technician makes the request, which is
// before the company has chosen how to pay - so it can only ever be one number,
// and it is the card rate, the dearer of the two. An iDEAL payment costs the
// marketplace a flat ~EUR 0.30 instead, and the difference stays with the
// marketplace.
// Keep in sync with STRIPE_CARD_FEE_PERCENTAGE in
// src/transactions/transactionProcessExtraPayment.js, which is what the
// technician is shown.
const STRIPE_CARD_FEE_PERCENTAGE = 3;

// Its own line item rather than a commission: the marketplace takes no
// commission on an extra payment, this is only the cost of moving the money.
const STRIPE_FEE_CODE = 'line-item/stripe-fee';
exports.STRIPE_FEE_CODE = STRIPE_FEE_CODE;

/**
 * The marketplace's own commission doesn't apply to an extra payment - it is
 * money for work already agreed, not a new job being brokered.
 *
 * @returns {Object} { providerCommission, customerCommission }
 */
exports.getExtraPaymentCommissions = () => ({
  providerCommission: null,
  customerCommission: null,
});

// A push payment (iDEAL) costs a flat fee rather than a percentage, in the
// smallest currency unit. Keep in sync with STRIPE_IDEAL_FEE_IN_SUBUNITS in
// src/transactions/transactionProcessExtraPayment.js.
const STRIPE_IDEAL_FEE_IN_SUBUNITS = 30;

const IDEAL_PAYMENT_METHOD = 'ideal';

// The transitions that create the PaymentIntent for an extra payment. They are
// the point at which the payment method is finally known, so they are also
// where the fee can be worked out.
const EXTRA_PAYMENT_INITIATE_TRANSITIONS = [
  'transition/initiate-payment',
  'transition/initiate-push-payment',
];
exports.EXTRA_PAYMENT_INITIATE_TRANSITIONS = EXTRA_PAYMENT_INITIATE_TRANSITIONS;

exports.isExtraPaymentInitiateTransition = transitionName =>
  EXTRA_PAYMENT_INITIATE_TRANSITIONS.includes(transitionName);

/**
 * The Stripe fee on an extra payment, as a line item taken off the technician's
 * payout. The customer pays the amount that was asked for; the fee comes out of
 * what is paid out, and stays with the marketplace to cover the Stripe cost.
 *
 * The two methods are priced differently enough that one number can't stand for
 * both: a card is a percentage of the amount, iDEAL is a flat fee no matter how
 * large the payment is. That is why this is only worked out once the company
 * has chosen - see EXTRA_PAYMENT_INITIATE_TRANSITIONS.
 *
 * @param {Money} amount the extra payment amount
 * @param {string} paymentMethodType 'card' or 'ideal'
 * @returns {Array} the line item, or empty when there is no amount
 */
exports.getExtraPaymentStripeFeeLineItem = (amount, paymentMethodType) => {
  if (!amount) {
    return [];
  }

  if (paymentMethodType === IDEAL_PAYMENT_METHOD) {
    // Never more than the payment itself, so a tiny extra payment can't produce
    // a negative payout.
    const feeInSubunits = Math.min(STRIPE_IDEAL_FEE_IN_SUBUNITS, amount.amount);

    return [
      {
        code: STRIPE_FEE_CODE,
        unitPrice: new Money(-feeInSubunits, amount.currency),
        quantity: 1,
        includeFor: ['provider'],
      },
    ];
  }

  return [
    {
      code: STRIPE_FEE_CODE,
      unitPrice: amount,
      percentage: -STRIPE_CARD_FEE_PERCENTAGE,
      includeFor: ['provider'],
    },
  ];
};

// Once a payment has been confirmed the job is taken. Push payment methods
// (iDEAL) are confirmed by the operator from the Stripe webhook, through a
// transition of their own, so both of these mean the same thing here.
const CONFIRM_PAYMENT = 'transition/confirm-payment';
exports.CONFIRM_PAYMENT = CONFIRM_PAYMENT;
const CONFIRM_PUSH_PAYMENT = 'transition/confirm-push-payment';
exports.CONFIRM_PUSH_PAYMENT = CONFIRM_PUSH_PAYMENT;
exports.paymentConfirmedTransitions = [CONFIRM_PAYMENT, CONFIRM_PUSH_PAYMENT];

const TRANSACTIONS_PER_PAGE = 100;

/**
 * Every transaction on a listing, following pagination to the end. A job with
 * more than a page of transactions is unlikely, but a partial list would
 * silently miss offers.
 *
 * @param {Object} iSdk Integration SDK instance
 * @param {string} listingId
 * @returns {Promise<Array>} transaction resources
 */
const queryAllTransactionsForListing = async (iSdk, listingId) => {
  let transactions = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await iSdk.transactions.query({
      listingId,
      page,
      perPage: TRANSACTIONS_PER_PAGE,
    });
    transactions = [...transactions, ...(response?.data?.data || [])];
    totalPages = response?.data?.meta?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return transactions;
};
exports.queryAllTransactionsForListing = queryAllTransactionsForListing;

const LISTING_STATE_CLOSED = 'closed';

/**
 * Awards a job to the technician whose offer was paid for:
 *   1. closes the job, so it stops taking new offers
 *   2. rejects every other offer still on the table
 *
 * A job is a listing in Marketplace API terms, which is why this closes a
 * listing. Rejecting is an operator transition, so it needs the Integration SDK.
 *
 * Called once the payment is confirmed - by the client for card payments, and
 * by the Stripe webhook for push payments, where the customer never comes back
 * through the client to confirm. It is safe to run more than once for the same
 * transaction. The offer-availability check is the backstop for the case where
 * it doesn't run at all.
 *
 * @param {Object} iSdk Integration SDK instance
 * @param {string} transactionId
 * @returns {Promise<Object>} { listingId, closed, rejectedOffers, failedRejections }.
 *   listingId is null when the transaction has no listing to award.
 */
const awardJobForTransaction = async (iSdk, transactionId) => {
  const response = await iSdk.transactions.show({
    id: transactionId,
    include: ['listing'],
    'fields.listing': ['state'],
  });

  const listing = response?.data?.included?.find(entity => entity.type === 'listing');
  const listingId = listing?.id?.uuid;

  if (!listingId) {
    return { listingId: null, closed: false, rejectedOffers: 0, failedRejections: 0 };
  }

  // Closing an already closed listing is an error, and this can be called
  // more than once for the same transaction.
  const isAlreadyClosed = listing.attributes?.state === LISTING_STATE_CLOSED;
  if (!isAlreadyClosed) {
    await iSdk.listings.close({ id: listingId });
  }

  // Every other offer still waiting on this job is out of the running now.
  // The winning transaction has moved past 'offer-pending' by this point, but
  // it is left out by id as well, so this can't reject the offer it awarded.
  const transactions = await queryAllTransactionsForListing(iSdk, listingId);
  const losingOffers = transactions.filter(
    tx =>
      tx.id?.uuid !== transactionId &&
      pendingOfferTransitions.includes(tx.attributes?.lastTransition)
  );

  // One offer failing to transition shouldn't stop the rest, so they are
  // settled independently and the failures are reported back.
  const results = await Promise.allSettled(
    losingOffers.map(tx =>
      iSdk.transactions.transition({
        id: tx.id,
        transition: OPERATOR_REJECT_OFFER,
        params: {},
      })
    )
  );

  const failedRejections = results.filter(r => r.status === 'rejected');
  failedRejections.forEach(r => {
    console.error('Failed to reject offer after awarding job:', r.reason?.message || r.reason);
  });

  return {
    listingId,
    closed: !isAlreadyClosed,
    rejectedOffers: results.length - failedRejections.length,
    failedRejections: failedRejections.length,
  };
};
exports.awardJobForTransaction = awardJobForTransaction;

/**
 * @typedef {Object} NegotiationOffer
 * @property {string} transition - The transition name that was triggered to make this offer
 * @property {string} by - The actor who made the offer ('provider' or 'customer')
 * @property {number} offerInSubunits - The offer amount in subunits (smallest currency unit)
 */

/**
 * @typedef {Object} TransitionRecord
 * @property {string} transition - The transition name
 * @property {string} by - The actor who made the transition ('provider' or 'customer')
 * @property {string} createdAt - ISO timestamp when the transition was created
 */

/**
 * Checks if the transition is a make offer transition and if the offer is greater than 0.
 *
 * @param {number} offerInSubunits
 * @param {string} transitionName
 * @returns {boolean}
 */
exports.isIntentionToMakeOffer = (offerInSubunits, transitionName) => {
  const isIntentionToMakeOffer = makeOfferTransitions.includes(transitionName);
  const hasOffer = offerInSubunits > 0;
  return isIntentionToMakeOffer && hasOffer;
};
/**
 * Checks if the transition is a make counter offer transition and if the offer is greater than 0.
 *
 * @param {number} offerInSubunits
 * @param {string} transitionName
 * @returns {boolean}
 */
exports.isIntentionToMakeCounterOffer = (offerInSubunits, transitionName) => {
  const isIntentionToMakeCounterOffer = counterOfferTransitions.includes(transitionName);
  const hasOffer = offerInSubunits > 0;
  return isIntentionToMakeCounterOffer && hasOffer;
};
/**
 * Checks if the transition is a update offer transition.
 *
 * @param {string} transitionName
 * @returns {boolean}
 */
exports.isIntentionToUpdateOffer = (offerInSubunits, transitionName) => {
  const isIntentionToUpdateOffer = updateOfferTransitions.includes(transitionName);
  const hasOffer = offerInSubunits > 0;
  return isIntentionToUpdateOffer && hasOffer;
};
/**
 * Checks if the transition is a revoke counter offer transition.
 *
 * @param {string} transitionName
 * @returns {boolean}
 */
exports.isIntentionToRevokeCounterOffer = transitionName => {
  return revokeCounterOfferTransitions.includes(transitionName);
};

const filterRelevantTransitions = (transitions, relevantTransitions) => {
  return transitions.filter(t => relevantTransitions.includes(t.transition));
};
const isValidNegotiationOffersArray = (offers, transitions, relevantTransitions) => {
  const pickedTransitions = filterRelevantTransitions(transitions, relevantTransitions);
  const isOffersAnArray = !!offers && Array.isArray(offers);

  // First check if we have the same number of offers and transitions
  if (!isOffersAnArray || offers.length !== pickedTransitions.length) {
    return false;
  }

  // Then verify that each offer corresponds to the transition at the same index
  // and that the order matches
  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    const transition = pickedTransitions[i];

    // Check if the offer's transition and actor match the transition at the same index
    if (offer.transition !== transition.transition || offer.by !== transition.by) {
      return false;
    }
  }

  return true;
};

/**
 * Throws an error if the negotiation offers array is invalid.
 * Validation is done by reducing transitions array to only include relevant transitions (that set offers)
 * and then checking that transitions match with the offers array.
 *
 * @param {string} transitionName
 * @param {Array<NegotiationOffer>} offers - Array of negotiation offers
 * @param {Array<TransitionRecord>} transitions - Array of transition records
 */
exports.throwErrorIfNegotiationOfferHasInvalidHistory = (transitionName, offers, transitions) => {
  // const isNegotiationProcess = transaction.attributes.processName === 'default-negotiation';
  const isRelevantTransition = offerTransitionsInNegotiationProcess.includes(transitionName);

  if (
    isRelevantTransition &&
    !isValidNegotiationOffersArray(offers, transitions, offerTransitionsInNegotiationProcess)
  ) {
    const error = new Error('Past negotiation offers are invalid');
    error.status = 400;
    error.statusText = 'Past negotiation offers are invalid';
    error.data = {
      offers: offers,
      relevantTransitions: filterRelevantTransitions(
        transitions,
        offerTransitionsInNegotiationProcess
      ),
    };
    throw error;
  }
};

const getPreviousOffer = offers => {
  if (offers?.length < 2) {
    const error = new Error('Past negotiation offers are invalid');
    error.status = 400;
    error.statusText = 'Past negotiation offers are invalid';
    error.data = {
      offers: offers,
    };
    throw error;
  }
  return offers[offers.length - 2];
};

/**
 * Returns the offerInSubunits from the previous offer.
 *
 * @param {Array<NegotiationOffer>} offers - Array of negotiation offers
 * @returns {number} offer from the previous offer (in subunits)
 */
exports.getAmountFromPreviousOffer = offers => {
  const offer = getPreviousOffer(offers);
  return offer.offerInSubunits;
};

/**
 * Adds an offer to the offers array in the metadata of a transaction.
 *
 * @param {Object} metadata - Transaction's metadata object
 * @param {NegotiationOffer} offer - The offer to add to the metadata
 * @returns {Object} The updated metadata object
 */
exports.addOfferToMetadata = (metadata, offer) => {
  const existingOffers = metadata?.offers || [];
  return !!offer && metadata
    ? {
        metadata: {
          ...metadata,
          offers: [...existingOffers, offer],
        },
      }
    : metadata
    ? { metadata }
    : {};
};
