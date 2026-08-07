const { denormalisedResponseEntities } = require('../api-util/data');
const { handleError, getIntegrationSdk } = require('../api-util/sdk');

module.exports = async function(req, res) {
  try {
    const { transactionId, rating } = req.body;
    const tokenUserId = req.tokenUserId;

    if (!transactionId || !rating) {
      return res.status(400).json({ error: 'Transaction ID and rating are required' });
    }

    const iSdk = getIntegrationSdk();

    const transaction = await iSdk.transactions.show({
      id: transactionId,
      include: ['listing', 'metadata', 'customer', 'provider'],
    });

    const tx = denormalisedResponseEntities(transaction)[0];

    const { isAggregatedRatingUpdated = false } = tx.attributes.metadata || {};

    if (tx.customer.id.uuid !== tokenUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isAggregatedRatingUpdated) {
      return res.status(400).json({ error: 'Aggregated rating already updated' });
    }

    const { aggregateRating = 0, numberOfRatings = 0 } = tx.provider.attributes.profile.publicData;

    const actualAggregateRating = aggregateRating / 100;
    const newAggregateRating = (
      (actualAggregateRating * numberOfRatings + rating) /
      (numberOfRatings + 1)
    ).toFixed(2);

    const storedAggregateRating = Number(newAggregateRating) * 100;

    await iSdk.users.updateProfile({
      id: tx.provider.id.uuid,
      publicData: {
        aggregateRating: storedAggregateRating,
        numberOfRatings: numberOfRatings + 1,
      },
    });

    await iSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        isAggregatedRatingUpdated: true,
      },
    });

    console.log('done updating aggregate rating');

    return res.status(200).json({ message: 'Aggregated rating updated' });
  } catch (error) {
    console.error('error updating aggregate rating', error);
    handleError(res, error);
  }
};
