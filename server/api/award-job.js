const { handleError, getIntegrationSdk } = require('../api-util/sdk');
const {
  OPERATOR_REJECT_OFFER,
  pendingOfferTransitions,
  queryAllTransactionsForListing,
} = require('../api-util/negotiation');

const LISTING_STATE_CLOSED = 'closed';

/**
 * Awards a job to the technician whose offer was paid for:
 *   1. closes the job, so it stops taking new offers
 *   2. rejects every other offer still on the table
 *
 * A job is a listing in Marketplace API terms, which is why this closes a
 * listing. Rejecting is an operator transition, so it needs the Integration SDK.
 *
 * Called after the payment is confirmed. The offer-availability check is the
 * backstop for the case where this doesn't run.
 *
 * Body: { transactionId }
 * Returns: { listingId, closed, rejectedOffers, failedRejections }
 */
module.exports = async function(req, res) {
  try {
    const { transactionId } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId is required' });
    }

    const iSdk = getIntegrationSdk();

    const response = await iSdk.transactions.show({
      id: transactionId,
      include: ['listing'],
      'fields.listing': ['state'],
    });

    const listing = response?.data?.included?.find(entity => entity.type === 'listing');
    const listingId = listing?.id?.uuid;

    if (!listingId) {
      return res.status(404).json({ error: 'No listing found for the transaction' });
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

    return res.status(200).json({
      listingId,
      closed: !isAlreadyClosed,
      rejectedOffers: results.length - failedRejections.length,
      failedRejections: failedRejections.length,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
