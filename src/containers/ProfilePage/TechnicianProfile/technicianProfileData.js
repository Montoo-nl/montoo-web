import {
  EQUIPMENT_USER_FIELD_KEY,
  SERVICE_AREA_USER_FIELD_KEY,
  getEquipmentOptions,
  getServiceAreaOptions,
  getSpecialisationOptions,
} from '../../../config/configTechnician';

/**
 * The parts of the technician profile design that nothing in the marketplace
 * stores yet.
 *
 * They are all gathered here rather than inlined into the components, so that
 * swapping one for real data is a change in a single place. Each carries the
 * field that would replace it.
 */
export const TECHNICIAN_PROFILE_PLACEHOLDERS = {
  // STATIC: no verification flag is readable on another user. The identity and
  // insurance documents a technician uploads live in protectedData, which never
  // leaves their own account.
  isVerified: true,

  // STATIC: users have no availability concept. Would need e.g.
  // publicData.availability, set by the technician.
  isAvailable: true,

  // Shown only until a technician sets their base location on the settings
  // page - see getBaseLocationLabel.
  baseLocation: 'Deventer, Overijssel',

  // STATIC: shown only when a technician has no specialisations saved, so the
  // section is never an empty box.
  skills: [
    'Air Conditioning Installation',
    'Heat Pump Installation',
    'Electrical Installations',
    'Solar Panel Installation',
    'EV Charger Installation',
    'Troubleshooting & Diagnostics',
    'Maintenance & Service',
    'Ventilation Systems',
  ],

  // STATIC: used when specialisationExperience is empty.
  yearsOfExperience: 8,
};

/**
 * STATIC: shown when a technician has uploaded no portfolio images. Deliberately
 * without urls - these render as empty tiles rather than borrowing images from
 * a host the content security policy would block anyway.
 */
export const PLACEHOLDER_PORTFOLIO = [
  { key: 'placeholder-1', title: 'Air Conditioning Installation', city: 'Deventer' },
  { key: 'placeholder-2', title: 'Heat Pump Installation', city: 'Zwolle' },
  { key: 'placeholder-3', title: 'Electrical Panel Upgrade', city: 'Apeldoorn' },
  { key: 'placeholder-4', title: 'Solar Panel Installation', city: 'Raalte' },
  { key: 'placeholder-5', title: 'EV Charger Installation', city: 'Deventer' },
];

/**
 * The technician's average rating and how many ratings it is based on.
 *
 * Both are written by server/api/update-aggregate-rating.js when a company
 * reviews a technician. The stored counter is used rather than counting the
 * loaded reviews, because the reviews query is unpaginated and caps out.
 *
 * @param {Object} publicData the profile's public data
 * @param {Array} reviews loaded reviews, used only as a fallback
 * @returns {Object|null} { rating, count } or null when there is nothing to show
 */
export const getAggregateRating = (publicData, reviews = []) => {
  const count = publicData?.numberOfRatings;
  const stored = publicData?.aggregateRating;

  if (count > 0 && stored != null) {
    // Stored as hundredths, and the multiplication that produced it leaves
    // float noise (4.83 is written as 482.99999999999994).
    return { rating: Math.round(stored) / 100, count };
  }

  // Technicians rated before the aggregate was introduced have reviews but no
  // counter, so fall back to averaging what is loaded.
  const rated = reviews.filter(r => typeof r?.attributes?.rating === 'number');
  if (rated.length === 0) {
    return null;
  }
  const total = rated.reduce((sum, r) => sum + r.attributes.rating, 0);
  return { rating: total / rated.length, count: rated.length };
};

/**
 * When the technician joined the marketplace. createdAt is on the public user
 * resource, so it is readable on anyone's profile, not just one's own.
 *
 * @param {Object} profileUser the user being viewed
 * @returns {Date|null} null when it isn't there, so the line can be left out
 *   rather than showing a made-up date
 */
export const getMemberSince = profileUser => {
  const createdAt = profileUser?.attributes?.createdAt;
  const date = createdAt instanceof Date ? createdAt : createdAt ? new Date(createdAt) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
};

/**
 * The technician's specialisations as labels, falling back to the placeholder
 * list when none are saved.
 *
 * @param {Object} publicData the profile's public data
 * @param {Object} config marketplace configuration
 * @returns {Array<string>} labels
 */
export const getSkillLabels = (publicData, config) => {
  const specialisations = publicData?.specialisations;
  if (!(specialisations?.length > 0)) {
    return TECHNICIAN_PROFILE_PLACEHOLDERS.skills;
  }

  const options = getSpecialisationOptions(config);
  return specialisations.map(key => options.find(o => o.key === key)?.label || key);
};

/**
 * Years of experience. It is stored per specialisation rather than as a total,
 * so the longest one is what the profile leads with.
 *
 * @param {Object} publicData the profile's public data
 * @returns {number} years
 */
export const getYearsOfExperience = publicData => {
  const years = Object.values(publicData?.specialisationExperience || {}).filter(
    value => typeof value === 'number' && value > 0
  );
  return years.length > 0
    ? Math.max(...years)
    : TECHNICIAN_PROFILE_PLACEHOLDERS.yearsOfExperience;
};

/**
 * The regions a technician works in, as one readable line. The labels come from
 * the hosted user field, so they follow whatever is set in Console.
 *
 * @param {Object} publicData the profile's public data
 * @param {Object} config marketplace configuration
 * @returns {string|null} null when no service areas are saved
 */
export const getWorkAreaLabel = (publicData, config) => {
  // Read through the key constant, so the field name lives in one place.
  const serviceAreas = publicData?.[SERVICE_AREA_USER_FIELD_KEY];
  if (!(serviceAreas?.length > 0)) {
    return null;
  }

  const options = getServiceAreaOptions(config);
  return serviceAreas.map(key => options.find(o => o.key === key)?.label || key).join(', ');
};

/**
 * What the technician can bring to a job - only what they actually have. The
 * options they didn't pick are left out rather than listed as missing: this is
 * a profile, so it reads as what is on offer.
 *
 * Mapped through the configured options rather than shown raw, so the labels
 * follow Console and anything since removed from the field drops out.
 *
 * @param {Object} publicData the profile's public data
 * @param {Object} config marketplace configuration
 * @returns {Array<Object>} [{ key, label }]
 */
export const getEquipmentItems = (publicData, config) => {
  const owned = publicData?.[EQUIPMENT_USER_FIELD_KEY] || [];
  return getEquipmentOptions(config).filter(({ key }) => owned.includes(key));
};

/**
 * Where the technician sets out from. Saved as { address, lat, lng } by the
 * profile settings page; only the address is shown here.
 *
 * @param {Object} publicData the profile's public data
 * @returns {string} the address, or the placeholder when none is set
 */
export const getBaseLocationLabel = publicData =>
  publicData?.baseLocation?.address || TECHNICIAN_PROFILE_PLACEHOLDERS.baseLocation;

/**
 * Portfolio tiles. Real uploads carry { key, url, name } and no caption yet -
 * title and city are read anyway, so the tiles fill in by themselves once those
 * fields are added to the upload form.
 *
 * @param {Object} publicData the profile's public data
 * @returns {Array<Object>} [{ key, url, title, city }]
 */
export const getPortfolioItems = publicData => {
  const portfolio = publicData?.portfolio;
  if (!(portfolio?.length > 0)) {
    return PLACEHOLDER_PORTFOLIO;
  }

  return portfolio.map(item => ({
    key: item.key,
    url: item.url,
    // The stored `name` is the raw filename, which is not worth showing.
    title: item.title || null,
    city: item.city || null,
  }));
};
