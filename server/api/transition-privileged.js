const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const {
  addOfferToMetadata,
  getAmountFromPreviousOffer,
  getExtraPaymentStripeFeeLineItem,
  isExtraPaymentInitiateTransition,
  STRIPE_FEE_CODE,
  isIntentionToMakeCounterOffer,
  isIntentionToMakeOffer,
  isIntentionToRevokeCounterOffer,
  isIntentionToUpdateOffer,
  throwErrorIfNegotiationOfferHasInvalidHistory,
} = require('../api-util/negotiation');
const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');

const { Money } = sharetribeSdk.types;

const transactionPromise = (sdk, id) => sdk.transactions.show({ id, include: ['listing'] });
const getListingRelationShip = transactionShowAPIData => {
  const { data, included } = transactionShowAPIData;
  const { relationships } = data;
  const { listing: listingRef } = relationships;
  return included.find(i => i.id.uuid === listingRef.data.id.uuid);
};

// When a provider is making an offer, make sure that customer related
// protected data is not being saved
const getRoleBasedBodyParams = (orderData, bodyParams) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams?.transition;
  const isProviderOffer =
    isIntentionToMakeOffer(offerInSubunits, transitionName) ||
    isIntentionToUpdateOffer(offerInSubunits, transitionName);

  if (!isProviderOffer) {
    return bodyParams;
  } else {
    const protectedData = bodyParams?.params?.protectedData || {};

    const filteredProtectedData = Object.entries(protectedData).reduce(
      (validEntries, [key, value]) => {
        if (key === 'customerDefaultMessage' || key.startsWith('customer_')) {
          return validEntries;
        } else {
          return { ...validEntries, [key]: value };
        }
      },
      {}
    );

    return {
      ...bodyParams,
      params: {
        ...bodyParams.params,
        protectedData: filteredProtectedData,
      },
    };
  }
};

const getFullOrderData = (orderData, bodyParams, currency, offers) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  const roleBasedBodyParams = getRoleBasedBodyParams(orderData, bodyParams);
  const orderDataAndParams = { ...orderData, ...roleBasedBodyParams.params, currency };

  const isNewOffer =
    isIntentionToMakeOffer(offerInSubunits, transitionName) ||
    isIntentionToMakeCounterOffer(offerInSubunits, transitionName) ||
    isIntentionToUpdateOffer(offerInSubunits, transitionName);

  return isNewOffer
    ? {
        ...orderDataAndParams,
        offer: new Money(offerInSubunits, currency),
      }
    : isIntentionToRevokeCounterOffer(transitionName)
    ? {
        ...orderDataAndParams,
        offer: new Money(getAmountFromPreviousOffer(offers), currency),
      }
    : orderDataAndParams;
};

const IDEAL_PAYMENT_METHOD = 'ideal';

/**
 * Line items for an extra payment that is about to be paid.
 *
 * privileged-set-line-items replaces everything, so the amount the technician
 * asked for has to be carried over as it stands - it was fixed when the request
 * was made and nothing here may change it. Only the Stripe fee is new, and it
 * is only now that it can be worked out, because it depends on how the company
 * chose to pay.
 *
 * @param {Object} transaction the extra payment transaction
 * @param {string} paymentMethodType 'card' or 'ideal'
 * @returns {Array} the line items to set
 */
const getExtraPaymentInitiateLineItems = (transaction, paymentMethodType) => {
  const existingLineItems = transaction.attributes.lineItems || [];

  // Rebuilt field by field: the API returns line items with computed extras
  // (lineTotal, reversal) that can't be sent back.
  const baseLineItems = existingLineItems
    .filter(lineItem => lineItem.code !== STRIPE_FEE_CODE && !lineItem.reversal)
    .map(lineItem => ({
      code: lineItem.code,
      unitPrice: lineItem.unitPrice,
      includeFor: lineItem.includeFor,
      ...(lineItem.quantity ? { quantity: lineItem.quantity } : {}),
      ...(lineItem.percentage ? { percentage: lineItem.percentage } : {}),
      ...(lineItem.seats ? { seats: lineItem.seats } : {}),
      ...(lineItem.units ? { units: lineItem.units } : {}),
    }));

  // An extra payment carries no commission, so what the company pays is exactly
  // what was asked for - which makes payinTotal the amount the fee applies to.
  const amount = transaction.attributes.payinTotal;

  return [...baseLineItems, ...getExtraPaymentStripeFeeLineItem(amount, paymentMethodType)];
};

const getUpdatedMetadata = (orderData, transition, existingMetadata) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for default-negotiation process, the actor is always "provider" when making an offer.
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  const isNewOffer =
    isIntentionToMakeOffer(offerInSubunits, transition) ||
    isIntentionToMakeCounterOffer(offerInSubunits, transition) ||
    isIntentionToUpdateOffer(offerInSubunits, transition);

  return isNewOffer
    ? addOfferToMetadata(existingMetadata, {
        offerInSubunits,
        by,
        transition,
      })
    : isIntentionToRevokeCounterOffer(transition)
    ? addOfferToMetadata(existingMetadata, {
        offerInSubunits: getAmountFromPreviousOffer(existingMetadata.offers),
        by,
        transition,
      })
    : addOfferToMetadata(existingMetadata, null);
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body || {};

  // Share one cookie token store so a refresh during transactions.show is reused for exchangeToken.
  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  const transitionName = bodyParams.transition;
  let lineItems = null;
  let metadataMaybe = {};

  Promise.all([transactionPromise(sdk, bodyParams?.id), fetchCommission(sdk)])
    .then(responses => {
      const [showTransactionResponse, fetchAssetsResponse] = responses;
      const transaction = showTransactionResponse.data.data;
      const listing = getListingRelationShip(showTransactionResponse.data);
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const existingMetadata = transaction?.attributes?.metadata;
      const existingOffers = existingMetadata?.offers || [];
      const transitions = transaction.attributes.transitions;

      // Check if the transition is related to negotiation offers and if the offers are valid
      throwErrorIfNegotiationOfferHasInvalidHistory(transitionName, existingOffers, transitions);

      const currency =
        transaction.attributes.payinTotal?.currency ||
        listing.attributes.price?.currency ||
        orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      // An extra payment about to be paid keeps its amount and only gains the
      // fee for the method chosen; everything else builds its line items from
      // the listing and the order data.
      const isExtraPaymentInitiate = isExtraPaymentInitiateTransition(transitionName);
      lineItems = isExtraPaymentInitiate
        ? getExtraPaymentInitiateLineItems(transaction, orderData?.paymentMethodType)
        : transactionLineItems(
            listing,
            getFullOrderData(orderData, bodyParams, currency, existingOffers),
            providerCommission,
            customerCommission
          );

      metadataMaybe = isExtraPaymentInitiate
        ? {}
        : getUpdatedMetadata(orderData, transitionName, existingMetadata);

      return getTrustedSdk(req, res, tokenStore);
    })
    .then(trustedSdk => {
      // Pass role based params to make sure that protectedData only contains protected data
      // for the correct role.
      // - For the default-negotiation process, this removes any customer
      //   related protected data fields if the transition is from a provider
      // - If you customize the transaction process to allow customers to update protected data
      //   after a provider's offer, you can add that logic in this same function.
      const roleBasedBodyParams = getRoleBasedBodyParams(orderData, bodyParams);
      // Omit listingId from params (transition/request-payment-after-inquiry does not need it)
      const { listingId, ...restParams } = roleBasedBodyParams?.params || {};

      // A push payment intent needs the allowed payment method types, and the
      // choice is kept on the transaction so the client knows which kind of
      // intent it is dealing with when the customer comes back from their bank.
      // Both are added here rather than trusted from the client, because this
      // is a privileged transition and its params are built server-side.
      const isPushPayment =
        isExtraPaymentInitiateTransition(transitionName) &&
        orderData?.paymentMethodType === IDEAL_PAYMENT_METHOD;
      const pushPaymentParamsMaybe = isPushPayment
        ? {
            paymentMethodTypes: [IDEAL_PAYMENT_METHOD],
            protectedData: { paymentMethodType: IDEAL_PAYMENT_METHOD },
          }
        : {};

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...restParams,
          lineItems,
          ...pushPaymentParamsMaybe,
          ...metadataMaybe,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.transitionSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.transition(body, queryParams);
    })
    .then(apiResponse => {
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
    .catch(e => {
      handleError(res, e);
    });
};
