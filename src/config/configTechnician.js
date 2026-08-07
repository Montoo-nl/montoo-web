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
 * Storage paths used when requesting presigned upload URLs from
 * `server/api/presigned-url.js`. The user id keeps one technician's files
 * separated from another's in the bucket.
 */
export const identityDocumentStoragePath = userId => `profiles/${userId}/identity`;
export const insuranceDocumentStoragePath = userId => `profiles/${userId}/insurance`;
export const certificateStoragePath = (userId, certificateType) =>
  `certifications/${userId}/${certificateType}`;
