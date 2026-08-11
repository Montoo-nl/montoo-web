const { handleError, getIntegrationSdk } = require('../api-util/sdk');

// Metadata key on the job's transaction that lists the extra payment requests
// made against it. Metadata is operator-only, hence the Integration SDK.
const EXTRA_PAYMENTS_KEY = 'extraPayments';

/**
 * Records an extra payment request on the job it belongs to.
 *
 * The request itself carries protectedData.parentTxId, but that direction can't
 * be queried - the Marketplace API doesn't filter on protectedData. Writing the
 * child's id into the job's metadata gives the transaction page something it
 * can read straight off the transaction it already loads.
 *
 * Body: { parentTxId, extraPaymentTxId }
 * Returns: { extraPayments }
 */
module.exports = async function(req, res) {
  try {
    const { parentTxId, extraPaymentTxId } = req.body || {};

    if (!parentTxId || !extraPaymentTxId) {
      return res.status(400).json({ error: 'parentTxId and extraPaymentTxId are required' });
    }

    const iSdk = getIntegrationSdk();

    const response = await iSdk.transactions.show({
      id: parentTxId,
      include: ['provider'],
    });

    const transaction = response?.data?.data;
    const provider = response?.data?.included?.find(entity => entity.type === 'user');

    // Only the technician on the job can attach an extra payment to it
    if (provider?.id?.uuid !== req.tokenUserId) {
      return res.status(403).json({ error: 'Only the provider of the transaction can do this' });
    }

    const current = transaction?.attributes?.metadata?.[EXTRA_PAYMENTS_KEY] || [];

    // The request may be retried, so don't add the same id twice
    if (current.includes(extraPaymentTxId)) {
      return res.status(200).json({ [EXTRA_PAYMENTS_KEY]: current });
    }

    const extraPayments = [...current, extraPaymentTxId];

    await iSdk.transactions.updateMetadata({
      id: parentTxId,
      metadata: { [EXTRA_PAYMENTS_KEY]: extraPayments },
    });

    return res.status(200).json({ [EXTRA_PAYMENTS_KEY]: extraPayments });
  } catch (error) {
    return handleError(res, error);
  }
};
