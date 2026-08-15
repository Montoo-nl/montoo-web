import { displayPrice, isPriceVariationsEnabled } from '../../util/configHelpers';
import { formatMoney, moneyFromExtendedData } from '../../util/currency';
import { richText } from '../../util/richText';
import { isBookingProcessAlias } from '../../transactions/transaction';

import css from './ListingCard.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 10;

// How many parts of the address a card shows. Geocoded addresses come back
// fine-grained - '4307 LJ, Oosterland, Zeeland, Nederland' - and a card only
// has room for the broad strokes, so it keeps the last two: the region and the
// country the job is in.
const ADDRESS_PARTS_ON_CARD = 2;

/**
 * The tail end of an address, for a card that can't fit the whole thing.
 *
 * Shorter addresses are left alone rather than padded, so a place that is only
 * written as 'Zeeland, Nederland' already reads correctly.
 *
 * @param {string} address the full address from publicData.location
 * @returns {string|null} the last parts of it, or null when there is no address
 */
const shortLocationAddress = address => {
  if (!address) {
    return null;
  }

  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.slice(-ADDRESS_PARTS_ON_CARD).join(', ') : null;
};

const priceData = (price, currency, intl) => {
  if (price && price.currency === currency) {
    const formattedPrice = formatMoney(intl, price);
    return { formattedPrice, priceTooltip: formattedPrice };
  } else if (price) {
    return {
      formattedPrice: intl.formatMessage(
        { id: 'ListingCard.unsupportedPrice' },
        { currency: price.currency }
      ),
      priceTooltip: intl.formatMessage(
        { id: 'ListingCard.unsupportedPriceTitle' },
        { currency: price.currency }
      ),
    };
  }
  return {};
};

const findCategoryLabel = (categories = [], optionId) => {
  if (!optionId) {
    return null;
  }
  for (const category of categories) {
    if (category.id === optionId) {
      return category.name || category.label || optionId;
    }
    const nested = findCategoryLabel(category.subcategories, optionId);
    if (nested) {
      return nested;
    }
  }
  return null;
};

/**
 * Returns all translated and formatted strings for ListingCard so the
 * presentational component can stay simple and aria-labels use the same copy.
 *
 * @param {Object} listing - API entity: listing or ownListing
 * @param {Object} config - app configuration (e.g. from useConfiguration())
 * @param {Object} intl - React Intl instance (e.g. from useIntl())
 * @returns {Object} translations and derived values:
 *   - titlePlain: raw title string (for aria/alt)
 *   - titleFormatted: React nodes from richText(title) for display
 *   - showPrice: whether to show the price block
 *   - priceTooltip: string for the price element's title attribute (tooltip on hover)
 *   - priceMessage: string or null for the price block content (same translation as used in cardAriaLabel when shown)
 *   - formattedPrice: plain formatted money string
 *   - cardAriaLabel: ready-to-use aria-label for the card link (listing title + price line when shown)
 *   - authorName: "ListingCard.author" string containing author's display name
 *   - locationAddress: location address from publicData when available
 *   - categoryLabel: resolved category label for badge when available
 */
export const getListingCardTranslations = (listing, config, intl) => {
  const { title = '', price, publicData } = listing?.attributes || {};

  const authorDisplayName = listing?.author?.attributes?.profile?.displayName;
  const authorName = intl.formatMessage(
    { id: 'ListingCard.author' },
    { authorName: authorDisplayName }
  );

  const validListingTypes = config.listing.listingTypes || [];
  const { listingType, location, categoryLevel1, compensation } = publicData || {};
  const listingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);

  const showPrice = true || displayPrice(listingTypeConfig);
  // A job's amount is the compensation the company offers, saved to publicData
  // as plain data. Fall back to the listing's own price for listings that were
  // created before compensation existed.
  const displayedPrice = moneyFromExtendedData(compensation) || price;
  const { formattedPrice, priceTooltip } = priceData(displayedPrice, config.currency, intl);

  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);
  const hasMultiplePriceVariants = isPriceVariationsInUse && publicData?.priceVariants?.length > 1;
  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);

  const priceMessageId = hasMultiplePriceVariants
    ? 'ListingCard.priceStartingFrom'
    : 'ListingCard.price';

  const perUnitString = isBookable
    ? intl.formatMessage({ id: 'ListingCard.perUnit' }, { unitType: publicData?.unitType })
    : '';

  // Single formatted price line (amount + per-unit if applicable); used for both card aria and price block
  const priceValue = <span className={css.priceValue}>{formattedPrice}</span>;
  const pricePerUnit = isBookable ? <span className={css.perUnit}>{perUnitString}</span> : '';
  const priceMessage =
    showPrice && formattedPrice != null
      ? intl.formatMessage({ id: priceMessageId }, { priceValue, pricePerUnit })
      : '';

  const cardAriaLabel =
    priceMessage.length > 0
      ? intl.formatMessage(
          { id: 'ListingCard.screenreader.label' },
          { listingTitle: title, formattedPrice: priceMessage }
        )
      : title;

  const categories = config.categoryConfiguration?.categories || [];

  const categoryLabel =
    findCategoryLabel(categories, categoryLevel1) ||
    (typeof categoryLevel1 === 'string' ? categoryLevel1 : null);

  return {
    titlePlain: title,
    titleFormatted: richText(title, {
      longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
      longWordClass: css.longWord,
    }),
    authorName,
    showPrice,
    priceTooltip,
    priceMessage,
    formattedPrice,
    cardAriaLabel,
    locationAddress: shortLocationAddress(location?.address),
    categoryLabel,
  };
};
