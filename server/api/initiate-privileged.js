const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const {
  getExtraPaymentCommissions,
  getExtraPaymentStripeFeeLineItem,
  isIntentionToMakeOffer,
  isIntentionToRequestExtraPayment,
} = require('../api-util/negotiation');
const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  getIntegrationSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');

const { Money } = sharetribeSdk.types;

const listingPromise = (sdk, id) => sdk.listings.show({ id });

const LISTING_STATE_CLOSED = 'closed';

// Note: the Integration SDK has its own UUID type and won't serialize the one
// the Marketplace SDK returns, so ids have to be rebuilt when crossing over.
const integrationSdkTypes = require('sharetribe-flex-integration-sdk').types;
const toIntegrationUUID = (id) => new integrationSdkTypes.UUID(id?.uuid || id);

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  // An extra payment names its amount the same way an offer does, so the line
  // items are built from it in the same way.
  const isAmountFromRequest =
    isIntentionToMakeOffer(offerInSubunits, transitionName) ||
    isIntentionToRequestExtraPayment(offerInSubunits, transitionName);

  return isAmountFromRequest
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body || {};
  const transitionName = bodyParams.transition;
  // Share one cookie token store so a refresh during listings.show is reused for exchangeToken.
  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  let lineItems = null;
  let metadataMaybe = {};

  // A job is closed once it has been paid for, and the Marketplace API won't
  // start a transaction against a closed listing. An extra payment is asked for
  // after that point, so the listing is opened for the initiate and closed
  // again straight after. Set to the listing id only when we did the opening,
  // so a job that was already open is left alone.
  let listingToReclose = null;

  const recloseListingMaybe = () => {
    if (!listingToReclose) {
      return Promise.resolve();
    }
    return getIntegrationSdk()
      .listings.close({ id: toIntegrationUUID(listingToReclose) })
      .catch((e) => {
        // Leaving it open would let the job take new offers again, so this is
        // worth shouting about - but not worth failing the request that already
        // went through.
        console.error('Failed to re-close listing after extra payment:', e.message);
      });
  };

  Promise.all([listingPromise(sdk, bodyParams?.params?.listingId), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const currency = listing.attributes.price?.currency || orderData.currency;
      const marketplaceCommissions =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      // An extra payment doesn't carry the marketplace's own commission - only
      // enough to cover the card fee.
      const isExtraPayment = isIntentionToRequestExtraPayment(
        orderData?.offerInSubunits,
        transitionName
      );
      const { providerCommission, customerCommission } = isExtraPayment
        ? getExtraPaymentCommissions()
        : marketplaceCommissions;

      const fullOrderData = getFullOrderData(orderData, bodyParams, currency);

      lineItems = [
        ...transactionLineItems(listing, fullOrderData, providerCommission, customerCommission),
        // The card fee is its own line item, taken off the payout
        ...(isExtraPayment ? getExtraPaymentStripeFeeLineItem(fullOrderData.offer) : []),
      ];
      metadataMaybe = getMetadata(orderData, transitionName);

      if (isExtraPayment && listing.attributes?.state === LISTING_STATE_CLOSED) {
        listingToReclose = listing.id;
        return getIntegrationSdk()
          .listings.open({ id: toIntegrationUUID(listing.id) })
          .then(() => getTrustedSdk(req));
      }

      return getTrustedSdk(req, res, tokenStore);
    })
    .then((trustedSdk) => {
      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
          ...metadataMaybe,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then((apiResponse) => recloseListingMaybe().then(() => apiResponse))
    .then((apiResponse) => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch((e) => {
      // The listing has to go back to closed even if the initiate failed
      recloseListingMaybe().then(() => handleError(res, e));
    });
};
