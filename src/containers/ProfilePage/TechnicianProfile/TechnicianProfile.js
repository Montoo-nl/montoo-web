import React, { useEffect, useState } from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { LayoutSingleColumn } from '../../../components';

import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';

import TechnicianHeaderCard from './TechnicianHeaderCard';
import TechnicianSkillsBand from './TechnicianSkillsBand';
import TechnicianPortfolio from './TechnicianPortfolio';
import css from './TechnicianProfile.module.css';

// Matches MAX_MOBILE_SCREEN_WIDTH in ProfilePage.js, which owns the reviews
// components this page reuses.
const MAX_MOBILE_SCREEN_WIDTH = 768;

/**
 * The profile page as a technician's shopfront: who they are, what they can do,
 * what they have built, and what companies have said about them.
 *
 * Companies keep the default profile layout - this variant is only reached for
 * the technician user type, from ProfilePage.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.user} props.profileUser - The user being viewed
 * @param {string} props.displayName - Their display name
 * @param {string} props.bio - Their bio
 * @param {Object} props.publicData - Their public data
 * @param {propTypes.error} props.userShowError - Error from loading the user
 * @param {Array<propTypes.review>} props.reviews - Their reviews
 * @param {propTypes.error} props.queryReviewsError - Error from loading reviews
 * @param {boolean} props.hideReviews - Whether the viewer may see reviews at all
 * @param {Object} props.userTypeRoles - { customer, provider } for the profile
 * @param {boolean} props.showLinkToProfileSettingsPage - Whether this is the viewer's own profile
 * @param {Object} props.intl - The intl object
 * @param {Object} props.MobileReviews - Reviews component for narrow screens
 * @param {Object} props.DesktopReviews - Reviews component for wide screens
 * @returns {JSX.Element}
 */
const TechnicianProfile = props => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    profileUser,
    displayName,
    bio,
    publicData,
    userShowError,
    reviews = [],
    queryReviewsError,
    hideReviews,
    userTypeRoles,
    showLinkToProfileSettingsPage,
    intl,
    MobileReviews,
    DesktopReviews,
  } = props;

  // Defaulting to the mobile layout keeps the server render and the first
  // client pass identical.
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout =
    mounted && hasMatchMedia
      ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
      : true;

  const content = userShowError ? (
    <p className={css.error}>
      <FormattedMessage id="ProfilePage.loadingDataFailed" />
    </p>
  ) : (
    <>
      <TechnicianHeaderCard
        profileUser={profileUser}
        displayName={displayName}
        bio={bio}
        publicData={publicData}
        reviews={reviews}
        showLinkToProfileSettingsPage={showLinkToProfileSettingsPage}
      />

      <TechnicianSkillsBand publicData={publicData} />

      <TechnicianPortfolio publicData={publicData} />

      {hideReviews ? null : (
        <section className={css.reviewsSection}>
          {isMobileLayout ? (
            <MobileReviews
              reviews={reviews}
              queryReviewsError={queryReviewsError}
              userTypeRoles={userTypeRoles}
            />
          ) : (
            <DesktopReviews
              reviews={reviews}
              queryReviewsError={queryReviewsError}
              userTypeRoles={userTypeRoles}
              intl={intl}
            />
          )}
        </section>
      )}
    </>
  );

  return (
    <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
      <div className={css.contentWrapper}>{content}</div>
    </LayoutSingleColumn>
  );
};

export default TechnicianProfile;
