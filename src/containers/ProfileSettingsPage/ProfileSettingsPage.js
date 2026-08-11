import React, { useEffect, useRef, useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { PROFILE_PAGE_PENDING_APPROVAL_VARIANT } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import {
  getCurrentUserTypeRoles,
  hasPermissionToInitiateTransactions,
  hasPermissionToPostListings,
  hasPermissionToViewData,
  initialsDisplayName,
  initialValuesForUserFields,
  isUserAuthorized,
  pickUserFieldsData,
  showCreateListingLinkForUser,
} from '../../util/userHelpers';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';

import { H3, H4, Modal, Page, UserNav, NamedLink, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import { getCertificateTypeOptions } from '../../config/configTechnician';

import ProfileSettingsForm from './ProfileSettingsForm/ProfileSettingsForm';

import { updateProfile, uploadImage } from './ProfileSettingsPage.duck';
import css from './ProfileSettingsPage.module.css';

const onImageUploadHandler = (values, fn) => {
  const { id, imageId, file } = values;
  if (file) {
    fn({ id, imageId, file });
  }
};

// Drop the certificate slots that don't have an uploaded file. The whole
// 'certificates' object is replaced on save, so leaving empty entries out keeps
// the stored data clean. Returns null when the technician has no certificates.
const pickUploadedCertificates = (certificates, certificateTypeOptions) => {
  const uploaded = certificateTypeOptions.reduce((picked, { key }) => {
    const file = certificates?.[key];
    return file?.url ? { ...picked, [key]: file } : picked;
  }, {});

  return Object.keys(uploaded).length > 0 ? uploaded : null;
};

// Years of experience per specialisation, kept to the specialisations that are
// actually selected - so unticking one doesn't leave its years behind. An
// emptied field, a missing entry, or anything that isn't a positive whole
// number is saved as 0, so every selected specialisation always has a number.
const pickSpecialisationExperience = (specialisations, experience) => {
  const picked = (specialisations || []).reduce((years, key) => {
    const value = Number.parseInt(experience?.[key], 10);
    return { ...years, [key]: Number.isFinite(value) && value > 0 ? value : 0 };
  }, {});

  return Object.keys(picked).length > 0 ? picked : null;
};

// A user whose profile hasn't been approved yet. The other states are 'active'
// and 'banned'.
const USER_STATE_PENDING_APPROVAL = 'pendingApproval';

// The business details asked from companies. The keys are used both as form
// field names and as keys in the user's protectedData.
// Note: kept in sync with the fields rendered by CompanyDetailsMaybe in
// ProfileSettingsForm.
const COMPANY_DETAIL_KEYS = [
  'companyName',
  'contactPerson',
  'chamberOfCommerceNumber',
  'vatNumber',
  'businessAddress',
  'companyPhone',
  'companyEmail',
  'companyWebsite',
];

// Trimmed company details, ready to be saved as protected data.
const pickCompanyDetails = values =>
  COMPANY_DETAIL_KEYS.reduce((picked, key) => {
    const value = values[key];
    return { ...picked, [key]: typeof value === 'string' ? value.trim() : value || null };
  }, {});

// Company details as form initial values. Undefined when nothing is saved yet,
// so that Final Form doesn't reinitialize on every render.
const companyDetailInitialValues = protectedData =>
  COMPANY_DETAIL_KEYS.reduce((values, key) => ({ ...values, [key]: protectedData?.[key] }), {});

// The permissions listed in the modal below, in the words of what the role
// actually does on this marketplace. They come from the currentUser's
// effectivePermissionSet relationship. Only the permissions that matter for the
// role are listed - a technician never posts a job, a company never applies.
const COMPANY_PERMISSION_ROWS = [
  {
    key: 'read',
    labelId: 'ProfileSettingsPage.permissionBrowseTechnicians',
    hasPermission: hasPermissionToViewData,
  },
  {
    key: 'postListings',
    labelId: 'ProfileSettingsPage.permissionCreateJobs',
    hasPermission: hasPermissionToPostListings,
  },
];

const TECHNICIAN_PERMISSION_ROWS = [
  {
    key: 'read',
    labelId: 'ProfileSettingsPage.permissionBrowseJobs',
    hasPermission: hasPermissionToViewData,
  },
  {
    key: 'initiateTransactions',
    labelId: 'ProfileSettingsPage.permissionApplyToJobs',
    hasPermission: hasPermissionToInitiateTransactions,
  },
];

/**
 * Tells the user that their profile hasn't been approved yet. Both technicians
 * and companies land here after saving their details for the first time: the
 * profile goes to review, and what they came to the marketplace to do only
 * opens up once an admin has approved them.
 *
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {boolean} props.isCompany - Whether the user has the 'customer' role.
 * Companies create jobs, technicians apply to them.
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Called when the modal is closed
 * @param {Function} props.onManageDisableScrolling - Called to disable/enable scrolling
 * @returns {JSX.Element}
 */
const PendingApprovalModal = props => {
  const { currentUser, isCompany, isOpen, onClose, onManageDisableScrolling } = props;

  const { email, emailVerified: isEmailVerified } = currentUser?.attributes || {};

  const permissionRows = isCompany ? COMPANY_PERMISSION_ROWS : TECHNICIAN_PERMISSION_ROWS;
  // Read permission gates everything else: applying to a job or creating one
  // both start from finding it, so a row can't be available on its own while
  // browsing is still blocked - even if the API grants that permission already.
  const canViewData = hasPermissionToViewData(currentUser);
  const permissions = permissionRows.map(row => ({
    ...row,
    isAllowed: row.hasPermission(currentUser) && (row.key === 'read' || canViewData),
  }));
  // Approval doesn't necessarily restrict anything: if the marketplace grants
  // every permission up front, there is nothing to list.
  const hasRestrictedPermissions = permissions.some(p => !p.isAllowed);

  return (
    <Modal
      id="ProfileSettingsPage.pendingApproval"
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <H4 as="h2" className={css.modalTitle}>
        <FormattedMessage id="ProfileSettingsPage.pendingApprovalTitle" />
      </H4>
      <p className={css.modalMessage}>
        <FormattedMessage
          id={
            isCompany
              ? 'ProfileSettingsPage.pendingApprovalMessageCompany'
              : 'ProfileSettingsPage.pendingApprovalMessageTechnician'
          }
        />
      </p>

      {hasRestrictedPermissions ? (
        <ul className={css.permissionList}>
          {permissions.map(({ key, labelId, isAllowed }) => (
            <li key={key} className={css.permissionRow}>
              <FormattedMessage id={labelId} />
              <span className={isAllowed ? css.permissionAllowed : css.permissionPending}>
                <FormattedMessage
                  id={
                    isAllowed
                      ? 'ProfileSettingsPage.permissionAllowed'
                      : 'ProfileSettingsPage.permissionPending'
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* The approval notice is sent by email, which never arrives if the
          address hasn't been verified. */}
      <p className={isEmailVerified ? css.emailNote : css.emailWarning}>
        <FormattedMessage
          id={
            isEmailVerified
              ? 'ProfileSettingsPage.pendingApprovalEmailNote'
              : 'ProfileSettingsPage.pendingApprovalEmailUnverified'
          }
          values={{ email: <strong>{email}</strong> }}
        />
      </p>
    </Modal>
  );
};

const ViewProfileLink = props => {
  const { userUUID, isUnauthorizedUser } = props;
  return userUUID && isUnauthorizedUser ? (
    <NamedLink
      className={css.profileLink}
      name="ProfilePageVariant"
      params={{ id: userUUID, variant: PROFILE_PAGE_PENDING_APPROVAL_VARIANT }}
    >
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : userUUID ? (
    <NamedLink className={css.profileLink} name="ProfilePage" params={{ id: userUUID }}>
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : null;
};

/**
 * ProfileSettingsPage
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.image - The image
 * @param {string} props.image.id - The image id
 * @param {propTypes.uuid} props.image.imageId - The image id
 * @param {File} props.image.file - The image file
 * @param {propTypes.image} props.image.uploadedImage - The uploaded image
 * @param {Function} props.onImageUpload - The image upload function
 * @param {Function} props.onManageDisableScrolling - Disables/enables scrolling for the modal
 * @param {Function} props.onUpdateProfile - The update profile function
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} props.updateProfileError - The update profile error
 * @param {propTypes.error} props.uploadImageError - The upload image error
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @returns {JSX.Element}
 */
export const ProfileSettingsPageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    image,
    onImageUpload,
    // Modal needs this, but the page also renders fine without scroll locking
    onManageDisableScrolling = () => {},
    onUpdateProfile,
    scrollingDisabled,
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
  } = props;

  const { userFields, userTypes = [] } = config.user;
  const publicUserFields = userFields.filter(uf => uf.scope === 'public');

  // Technicians (the 'provider' role) are asked for their service area,
  // specialisations and documents. Companies (the 'customer' role) are asked
  // for their business details instead.
  const { provider: isTechnician, customer: isCompany } = getCurrentUserTypeRoles(
    config,
    currentUser
  );

  const currentUserId = currentUser?.id?.uuid;
  const isPendingApproval = currentUser?.attributes?.state === USER_STATE_PENDING_APPROVAL;
  const isProfileSubmitted = !!currentUser?.attributes?.profile?.privateData?.profileSubmitted;

  // Saving the profile sets privateData.profileSubmitted, which marks the point
  // where the profile went to review. From then on the modal is shown every
  // time this page is opened, and again after every save, until the marketplace
  // has approved the user. Technicians and companies alike.
  const showPendingApprovalModal = isPendingApproval && isProfileSubmitted;
  const [isPendingApprovalModalOpen, setIsPendingApprovalModalOpen] = useState(false);

  useEffect(() => {
    if (currentUserId && showPendingApprovalModal) {
      setIsPendingApprovalModalOpen(true);
    }
  }, [currentUserId, showPendingApprovalModal]);

  const wasUpdateInProgress = useRef(updateInProgress);
  useEffect(() => {
    const updateJustFinished = wasUpdateInProgress.current && !updateInProgress;
    wasUpdateInProgress.current = updateInProgress;

    if (updateJustFinished && !updateProfileError && showPendingApprovalModal) {
      setIsPendingApprovalModalOpen(true);
    }
  }, [updateInProgress, updateProfileError, showPendingApprovalModal]);

  const handleSubmit = (values, userType) => {
    const {
      firstName,
      lastName,
      displayName,
      bio: rawBio,
      serviceAreas,
      specialisations,
      specialisationExperience,
      hasCompanyVan,
      portfolio,
      identityDocument,
      insuranceDocument,
      certificates,
      ...rest
    } = values;

    // A company isn't shown the field, so their display name is always the
    // initials of the first and last name. Everyone else keeps what they typed,
    // and null lets the Marketplace API fall back to its own default.
    const companyDisplayName = initialsDisplayName(firstName, lastName);
    const displayNameMaybe = isCompany
      ? { displayName: companyDisplayName || null }
      : displayName
      ? { displayName: displayName.trim() }
      : { displayName: null };

    // Ensure that the optional bio is a string
    const bio = rawBio || '';

    // Service area and specialisations are public, so that companies can see
    // them. The documents themselves are only shared with transaction parties.
    const technicianPublicDataMaybe = isTechnician
      ? {
          serviceAreas: serviceAreas?.length > 0 ? serviceAreas : null,
          // The service area used to be a free-text field. Clear whatever a
          // technician wrote there, now that it is a list of provinces.
          serviceArea: null,
          specialisations: specialisations?.length > 0 ? specialisations : null,
          specialisationExperience: pickSpecialisationExperience(
            specialisations,
            specialisationExperience
          ),
          // FieldBoolean gives '' when the question is left unanswered
          hasCompanyVan: typeof hasCompanyVan === 'boolean' ? hasCompanyVan : null,
          // Work images are meant to be seen, so they are public alongside the
          // rest of what a company looks at when picking a technician.
          portfolio: portfolio?.length > 0 ? portfolio : null,
        }
      : {};
    const technicianProtectedDataMaybe = isTechnician
      ? {
          identityDocument: identityDocument || null,
          insuranceDocument: insuranceDocument || null,
          certificates: pickUploadedCertificates(certificates, getCertificateTypeOptions(config)),
        }
      : {};
    // A company's business details. They are required in the form, so they are
    // always filled in by the time this runs.
    const companyProtectedDataMaybe = isCompany ? pickCompanyDetails(rest) : {};

    const protectedData = { ...technicianProtectedDataMaybe, ...companyProtectedDataMaybe };
    const protectedDataMaybe = Object.keys(protectedData).length > 0 ? { protectedData } : {};

    // Marks that the user has sent their details in at least once. Technicians
    // use it to know their profile is in review, companies to know whether they
    // have already been pointed to the new job page.
    const privateDataMaybe =
      isTechnician || isCompany ? { privateData: { profileSubmitted: true } } : {};

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...displayNameMaybe,
      bio,
      publicData: {
        ...pickUserFieldsData(rest, 'public', userType, userFields),
        ...technicianPublicDataMaybe,
      },
      ...privateDataMaybe,
      ...protectedDataMaybe,
    };
    const uploadedImage = props.image;

    // Update profileImage only if file system has been accessed
    const updatedValues =
      uploadedImage && uploadedImage.imageId && uploadedImage.file
        ? { ...profile, profileImageId: uploadedImage.imageId }
        : profile;

    onUpdateProfile(updatedValues);
  };

  const user = ensureCurrentUser(currentUser);
  const {
    firstName,
    lastName,
    displayName,
    bio,
    publicData,
    protectedData,
  } = user?.attributes.profile;
  // I.e. the status is active, not pending-approval or banned
  const isUnauthorizedUser = currentUser && !isUserAuthorized(currentUser);

  const { userType } = publicData || {};
  const profileImageId = user.profileImage ? user.profileImage.id : null;
  const profileImage = image || { imageId: profileImageId };
  const userTypeConfig = userTypes.find(config => config.userType === userType);
  const isDisplayNameIncluded =
    !isCompany && userTypeConfig?.defaultUserFields?.displayName !== false;
  // ProfileSettingsForm decides if it's allowed to show the input field.
  const displayNameMaybe = isDisplayNameIncluded && displayName ? { displayName } : {};

  // Note: these are intentionally left undefined when the user hasn't saved
  // anything yet. Creating new objects/arrays here on every render would make
  // Final Form reinitialize the form and discard the user's input.
  const technicianInitialValuesMaybe = isTechnician
    ? {
        serviceAreas: publicData?.serviceAreas,
        specialisations: publicData?.specialisations,
        specialisationExperience: publicData?.specialisationExperience,
        hasCompanyVan: publicData?.hasCompanyVan,
        portfolio: publicData?.portfolio,
        identityDocument: protectedData?.identityDocument,
        insuranceDocument: protectedData?.insuranceDocument,
        certificates: protectedData?.certificates,
      }
    : {};
  const companyInitialValuesMaybe = isCompany ? companyDetailInitialValues(protectedData) : {};

  const profileSettingsForm = user.id ? (
    <ProfileSettingsForm
      className={css.form}
      currentUser={currentUser}
      initialValues={{
        firstName,
        lastName,
        ...displayNameMaybe,
        bio,
        profileImage: user.profileImage,
        ...initialValuesForUserFields(publicData, 'public', userType, userFields),
        ...technicianInitialValuesMaybe,
        ...companyInitialValuesMaybe,
      }}
      profileImage={profileImage}
      onImageUpload={e => onImageUploadHandler(e, onImageUpload)}
      uploadInProgress={uploadInProgress}
      updateInProgress={updateInProgress}
      uploadImageError={uploadImageError}
      updateProfileError={updateProfileError}
      onSubmit={values => handleSubmit(values, userType)}
      marketplaceName={config.marketplaceName}
      userFields={publicUserFields}
      userTypeConfig={userTypeConfig}
      isTechnician={isTechnician}
      isCompany={isCompany}
    />
  ) : null;

  const title = intl.formatMessage({ id: 'ProfileSettingsPage.title' });

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);

  return (
    <Page className={css.root} title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={
          <>
            <TopbarContainer />
            <UserNav
              currentPage="ProfileSettingsPage"
              showManageListingsLink={showManageListingsLink}
            />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <div className={css.headingContainer}>
            <H3 as="h1" className={css.heading}>
              <FormattedMessage id="ProfileSettingsPage.heading" />
            </H3>

            <ViewProfileLink userUUID={user?.id?.uuid} isUnauthorizedUser={isUnauthorizedUser} />
          </div>
          {profileSettingsForm}

          <PendingApprovalModal
            currentUser={currentUser}
            isCompany={isCompany}
            isOpen={isPendingApprovalModalOpen}
            onClose={() => setIsPendingApprovalModalOpen(false)}
            onManageDisableScrolling={onManageDisableScrolling}
          />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    image,
    uploadImageError,
    uploadInProgress,
    updateInProgress,
    updateProfileError,
  } = state.ProfileSettingsPage;
  return {
    currentUser,
    image,
    scrollingDisabled: isScrollingDisabled(state),
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onImageUpload: data => dispatch(uploadImage(data)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  onUpdateProfile: data => dispatch(updateProfile(data)),
});

const ProfileSettingsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ProfileSettingsPageComponent);

export default ProfileSettingsPage;
