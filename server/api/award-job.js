const { handleError, getIntegrationSdk } = require('../api-util/sdk');
const { awardJobForTransaction } = require('../api-util/negotiation');

/**
 * Awards a job to the technician whose offer was paid for: closes the job and
 * rejects every other offer still on the table.
 *
 * Called by the client after a card payment is confirmed. Push payments (iDEAL)
 * go through the Stripe webhook instead, which calls the same helper.
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

    const result = await awardJobForTransaction(getIntegrationSdk(), transactionId);

    if (!result.listingId) {
      return res.status(404).json({ error: 'No listing found for the transaction' });
    }

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};
