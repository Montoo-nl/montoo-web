// default-negotiation process: transitions that make the first offer
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
exports.pendingOfferTransitions = makeOfferTransitions;

// Lets the operator take a pending offer off the table, e.g. when the job has
// gone to someone else.
exports.OPERATOR_REJECT_OFFER = 'transition/operator-reject-offer';

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

// What Stripe charges to process the card payment. Withheld from the
// technician's payout so the marketplace isn't paying the card fee itself.
const STRIPE_FEE_PERCENTAGE = 3.2;

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

/**
 * The Stripe fee on an extra payment, as a line item taken off the technician's
 * payout. The customer pays the amount that was asked for; the fee comes out of
 * what is paid out, and stays with the marketplace to cover the card cost.
 *
 * @param {Money} amount the extra payment amount
 * @returns {Array} the line item, or empty when there is no amount
 */
exports.getExtraPaymentStripeFeeLineItem = amount => {
  if (!amount) {
    return [];
  }

  return [
    {
      code: STRIPE_FEE_CODE,
      unitPrice: amount,
      percentage: -STRIPE_FEE_PERCENTAGE,
      includeFor: ['provider'],
    },
  ];
};

// Once a payment has been confirmed the job is taken.
exports.CONFIRM_PAYMENT = 'transition/confirm-payment';

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
exports.queryAllTransactionsForListing = async (iSdk, listingId) => {
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
