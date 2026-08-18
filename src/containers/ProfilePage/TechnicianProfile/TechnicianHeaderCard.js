import React from 'react';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { richText } from '../../../util/richText';
import { AvatarLarge, H2, IconReviewStar, NamedLink } from '../../../components';

import { IconBuilding, IconVerifiedBadge } from './TechnicianIcons';
import {
  TECHNICIAN_PROFILE_PLACEHOLDERS as PLACEHOLDERS,
  getAggregateRating,
  getBaseLocationLabel,
  getMemberSince,
  getWorkAreaLabel,
} from './technicianProfileData';
import css from './TechnicianProfile.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 20;

// Dutch writes month names in lower case, so 'aug 2026' is what the formatter
// returns for this marketplace's locale. Shown mid-sentence next to the rating,
// it reads better capitalised.
const capitalizeFirst = s => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);

/**
 * The top card: who the technician is, how they are rated, and where they work.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.user} props.profileUser - The user being viewed
 * @param {string} props.displayName - Their display name
 * @param {string} props.bio - Their bio
 * @param {Object} props.publicData - Their public data
 * @param {Array<propTypes.review>} props.reviews - Loaded reviews, for the rating fallback
 * @param {boolean} props.showLinkToProfileSettingsPage - Whether this is the viewer's own profile
 * @returns {JSX.Element}
 */
const TechnicianHeaderCard = props => {
  const {
    profileUser,
    displayName,
    bio,
    publicData,
    reviews,
    showLinkToProfileSettingsPage,
  } = props;

  const config = useConfiguration();
  const intl = useIntl();

  const memberSince = getMemberSince(profileUser);
  const ratingMaybe = getAggregateRating(publicData, reviews);
  // Service areas are a Console-managed user field, so their labels are read
  // from the hosted configuration rather than a list kept in the codebase.
  const workArea = getWorkAreaLabel(publicData, config);

  const bioWithLinks = bio
    ? richText(bio, {
        linkify: true,
        longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
        longWordClass: css.longWord,
      })
    : null;

  return (
    <section className={css.headerCard}>
      <div className={css.headerIdentity}>
        <div className={css.avatarWrapper}>
          <AvatarLarge className={css.avatar} user={profileUser} disableProfileLink />
          {PLACEHOLDERS.isVerified ? (
            <span className={css.verifiedBadge}>
              <IconVerifiedBadge className={css.verifiedBadgeIcon} />
              <FormattedMessage id="TechnicianProfile.verified" />
            </span>
          ) : null}
        </div>

        <div className={css.headerDetails}>
          <div className={css.nameRow}>
            <H2 as="h1" className={css.name}>
              {displayName}
            </H2>
            {PLACEHOLDERS.isAvailable ? (
              <span className={css.availability}>
                <span className={css.availabilityDot} />
                <FormattedMessage id="TechnicianProfile.available" />
              </span>
            ) : null}
          </div>

          <div className={css.metaRow}>
            {ratingMaybe ? (
              <span className={css.rating}>
                <IconReviewStar isFilled rootClassName={css.ratingStar} />
                <span className={css.ratingValue}>{ratingMaybe.rating.toFixed(1)}</span>
                <span className={css.ratingCount}>
                  <FormattedMessage
                    id="TechnicianProfile.reviewCount"
                    values={{ count: ratingMaybe.count }}
                  />
                </span>
              </span>
            ) : null}
            {memberSince ? (
              <span className={css.memberSince}>
                <FormattedMessage
                  id="TechnicianProfile.memberSince"
                  values={{
                    date: capitalizeFirst(
                      intl.formatDate(memberSince, { month: 'short', year: 'numeric' })
                    ),
                  }}
                />
              </span>
            ) : null}
          </div>

          {bioWithLinks ? <p className={css.bio}>{bioWithLinks}</p> : null}

          {showLinkToProfileSettingsPage ? (
            <NamedLink className={css.editLink} name="ProfileSettingsPage">
              <FormattedMessage id="ProfilePage.editProfileLinkDesktop" />
            </NamedLink>
          ) : null}
        </div>
      </div>

      <aside className={css.locationPanel}>
        {workArea ? (
          <div className={css.locationRow}>
            <span className={css.locationIcon} aria-hidden="true">
              {/* IconLocation hard-codes fill on its path, so this page uses its own pin */}
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                <path
                  d="M7 1a5 5 0 015 5c0 3.5-5 9-5 9S2 9.5 2 6a5 5 0 015-5z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </span>
            <div>
              <p className={css.locationLabel}>
                <FormattedMessage id="TechnicianProfile.workArea" />
              </p>
              <p className={css.locationValue}>{workArea}</p>
            </div>
          </div>
        ) : null}

        <div className={css.locationRow}>
          <span className={css.locationIcon} aria-hidden="true">
            <IconBuilding />
          </span>
          <div>
            <p className={css.locationLabel}>
              <FormattedMessage id="TechnicianProfile.baseLocation" />
            </p>
            <p className={css.locationValue}>{getBaseLocationLabel(publicData)}</p>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default TechnicianHeaderCard;
