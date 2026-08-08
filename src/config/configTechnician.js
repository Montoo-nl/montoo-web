/////////////////////////////////////////////////////////////////
// Configuration related to technicians (users with the        //
// 'provider' role). Companies (the 'customer' role) don't see  //
// any of these fields on their own profile settings page.      //
/////////////////////////////////////////////////////////////////

// Note: neither the specialisations nor the certifications a technician can
// pick are listed here. Both come from the hosted configuration, so that a
// technician's profile always lines up with the jobs companies post:
// - specialisations are the top level (level 1) categories from
//   `config.categoryConfiguration`, saved as category ids to
//   publicData.specialisations
// - certifications are the options of the 'certifications' listing field, see
//   getCertificateTypeOptions below

// Key of the listing field whose enum options define the certifications a
// technician can upload proof of.
export const CERTIFICATIONS_LISTING_FIELD_KEY = 'certifications';

// The listing's level 1 category, i.e. the trade the job belongs to. A
// technician covers a trade by listing it among their specialisations.
export const CATEGORY_LEVEL_1_KEY = 'categoryLevel1';

/**
 * The specialisations a technician can pick, i.e. the top level (level 1)
 * categories from the hosted configuration. Saved as an array of category ids
 * to the user's publicData.specialisations.
 *
 * Note: only the category id is treated as stable. Names can be edited in
 * Console at any time, so they are only read for display, and the id is used as
 * the label if a category has no name.
 *
 * @param {Object} config marketplace configuration
 * @returns {Array<Object>} [{ key, label }] - empty if no categories are set up
 */
export const getSpecialisationOptions = config =>
  (config?.categoryConfiguration?.categories || [])
    .filter(category => category?.id != null)
    .map(category => ({
      key: `${category.id}`,
      label: category.name || `${category.id}`,
    }));

/**
 * The certifications a technician can upload proof of, taken from the
 * 'certifications' listing field in the hosted configuration. Each option gets
 * its own upload slot on ProfileSettingsPage and is saved under the matching
 * key in the user's protectedData:
 *   protectedData.certificates['f-gas'] = { name, key, url, size, mimeType, uploadedAt }
 *
 * Companies express which certifications a job requires with the very same
 * listing field, so the keys match on both sides by construction.
 *
 * Note: only the 'option' value is treated as stable. The label and everything
 * else in the config can be edited in Console at any time, so labels are only
 * read for display and never stored - and the option value is used as the label
 * if the option has none.
 *
 * @param {Object} config marketplace configuration
 * @returns {Array<Object>} [{ key, label }] - empty if the listing field is missing
 */
export const getCertificateTypeOptions = config => {
  const listingFields = config?.listing?.listingFields || [];
  const certificationsField = listingFields.find(f => f.key === CERTIFICATIONS_LISTING_FIELD_KEY);

  return (certificationsField?.enumOptions || [])
    .filter(o => o?.option != null)
    .map(o => ({
      key: `${o.option}`,
      label: o.label || `${o.option}`,
    }));
};

/**
 * The certifications a job requires that the technician hasn't uploaded.
 *
 * The job lists what it requires in publicData.certifications (an array of
 * option values), and the technician's uploads are keyed by the same option
 * values in protectedData.certificates - so the two line up directly.
 *
 * @param {Object} listingPublicData publicData of the job listing
 * @param {Object} currentUser API entity, or null when nobody is logged in
 * @returns {Array<string>} the option values that are missing, empty if none
 */
export const getMissingCertifications = (listingPublicData, currentUser) => {
  const required = listingPublicData?.[CERTIFICATIONS_LISTING_FIELD_KEY];
  const certificates = currentUser?.attributes?.profile?.protectedData?.certificates || {};

  return Array.isArray(required) ? required.filter(option => !certificates[option]?.url) : [];
};

/**
 * The job's trade, if the technician doesn't have it among their
 * specialisations. Both sides use category ids, so they compare directly.
 *
 * @param {Object} listingPublicData publicData of the job listing
 * @param {Object} currentUser API entity, or null when nobody is logged in
 * @returns {Array<string>} the category id that is missing, empty if none
 */
export const getMissingSpecialisations = (listingPublicData, currentUser) => {
  const required = listingPublicData?.[CATEGORY_LEVEL_1_KEY];
  const specialisations = currentUser?.attributes?.profile?.publicData?.specialisations || [];

  return required && !specialisations.includes(required) ? [required] : [];
};

/**
 * Everything a job asks for that the technician's profile doesn't cover yet,
 * as labels ready to be shown.
 *
 * Returns nothing for a logged out visitor: they are sent to the login page on
 * submit, and only then can their profile be compared against the job.
 *
 * @param {Object} listingPublicData publicData of the job listing
 * @param {Object} currentUser API entity, or null when nobody is logged in
 * @param {Object} config marketplace configuration
 * @returns {Object} { specialisations: Array<string>, certifications: Array<string> }
 */
export const getMissingJobRequirements = (listingPublicData, currentUser, config) => {
  if (!currentUser?.id) {
    return { specialisations: [], certifications: [] };
  }

  const toLabels = (values, options) =>
    values.map(value => options.find(o => o.key === value)?.label || value);

  return {
    specialisations: toLabels(
      getMissingSpecialisations(listingPublicData, currentUser),
      getSpecialisationOptions(config)
    ),
    certifications: toLabels(
      getMissingCertifications(listingPublicData, currentUser),
      getCertificateTypeOptions(config)
    ),
  };
};

/**
 * Storage paths used when requesting presigned upload URLs from
 * `server/api/presigned-url.js`. The user id keeps one technician's files
 * separated from another's in the bucket.
 */
export const identityDocumentStoragePath = userId => `profiles/${userId}/identity`;
export const insuranceDocumentStoragePath = userId => `profiles/${userId}/insurance`;
export const certificateStoragePath = (userId, certificateType) =>
  `certifications/${userId}/${certificateType}`;
