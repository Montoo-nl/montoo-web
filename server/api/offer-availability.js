const { handleError, getIntegrationSdk } = require('../api-util/sdk');
const {
  CONFIRM_PAYMENT,
  pendingOfferTransitions,
  queryAllTransactionsForListing,
} = require('../api-util/negotiation');

// How many offers may sit on one job at the same time.
const MAX_PENDING_OFFERS = 3;

// Why an offer isn't allowed, for the client to turn into a message.
const JOB_TAKEN = 'jobTaken';
const OFFER_LIMIT_REACHED = 'offerLimitReached';

/**
 * Tells whether another offer can be made on a job.
 *
 * Body: { listingId }
 * Returns: { canMakeOffer, reason, pendingOfferCount, maxOffers, hasConfirmedPayment }
 */
module.exports = async function(req, res) {
  try {
    const { listingId } = req.body || {};

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const iSdk = getIntegrationSdk();
    const transactions = await queryAllTransactionsForListing(iSdk, listingId);

    const hasConfirmedPayment = transactions.some(tx =>
      (tx.attributes?.transitions || []).some(t => t.transition === CONFIRM_PAYMENT)
    );

    const pendingOfferCount = transactions.filter(tx =>
      pendingOfferTransitions.includes(tx.attributes?.lastTransition)
    ).length;

    const reason = hasConfirmedPayment
      ? JOB_TAKEN
      : pendingOfferCount >= MAX_PENDING_OFFERS
      ? OFFER_LIMIT_REACHED
      : null;

    return res.status(200).json({
      canMakeOffer: reason === null,
      reason,
      pendingOfferCount,
      maxOffers: MAX_PENDING_OFFERS,
      hasConfirmedPayment,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
