import React, { Component, useState } from 'react';
import { compose } from 'redux';
import { Field, Form as FinalForm } from 'react-final-form';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';
import arrayMutators from 'final-form-arrays';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, injectIntl, intlShape } from '../../../util/reactIntl';
import { ensureCurrentUser } from '../../../util/data';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { isUploadImageOverLimitError } from '../../../util/errors';
import { getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';
import {
  certificateStoragePath,
  getCertificateTypeOptions,
  identityDocumentStoragePath,
  insuranceDocumentStoragePath,
} from '../../../config/configTechnician';

import {
  Form,
  Avatar,
  Button,
  ImageFromFile,
  IconSpinner,
  FieldCheckboxGroup,
  FieldFileUpload,
  FieldTextInput,
  H4,
  CustomExtendedDataField,
} from '../../../components';

import css from './ProfileSettingsForm.module.css';

const ACCEPT_IMAGES = 'image/*';
const UPLOAD_CHANGE_DELAY = 2000; // Show spinner so that browser has time to load img srcset

const DisplayNameMaybe = props => {
  const { userTypeConfig, intl } = props;

  const isDisabled = userTypeConfig?.defaultUserFields?.displayName === false;
  if (isDisabled) {
    return null;
  }

  const { required } = userTypeConfig?.displayNameSettings || {};
  const isRequired = required === true;

  const validateMaybe = isRequired
    ? {
        validate: validators.required(
          intl.formatMessage({
            id: 'ProfileSettingsForm.displayNameRequired',
          })
        ),
      }
    : {};

  return (
    <div className={css.sectionContainer}>
      <H4 as="h2" className={css.sectionTitle}>
        <FormattedMessage id="ProfileSettingsForm.displayNameHeading" />
      </H4>
      <FieldTextInput
        className={css.row}
        type="text"
        id="displayName"
        name="displayName"
        label={intl.formatMessage({
          id: 'ProfileSettingsForm.displayNameLabel',
        })}
        placeholder={intl.formatMessage({
          id: 'ProfileSettingsForm.displayNamePlaceholder',
        })}
        {...validateMaybe}
      />
      <p className={css.extraInfo}>
        <FormattedMessage id="ProfileSettingsForm.displayNameInfo" />
      </p>
    </div>
  );
};

/**
 * Certificate uploads, one certification type at a time.
 *
 * The certifications a technician has already uploaded are listed first. Below
 * them is a dropdown with the certification types that are still missing:
 * picking one reveals an uploader, and once the file is in, the certification
 * moves up to the list and its option is dropped from the dropdown.
 *
 * Values are stored under `certificates.<certificateType>` in the form.
 *
 * @param {Object} props
 * @param {Array<Object>} props.options - Certification types as [{ key, label }]
 * @param {Object} props.certificates - Current value of the 'certificates' form field
 * @param {string} props.currentUserId - UUID of the current user, used in the storage path
 * @param {Function} props.onUploadStateChange - Called with (fieldName, isUploading)
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const CertificateUploads = props => {
  const { options, certificates, currentUserId, onUploadStateChange, intl } = props;
  const [selectedType, setSelectedType] = useState('');
  const [uploadingField, setUploadingField] = useState(null);

  // Passed to the uploaders instead of onUploadStateChange, so that the missing
  // document error can stay hidden while the file is on its way.
  const handleUploadStateChange = (fieldName, isUploading) => {
    setUploadingField(current =>
      isUploading ? fieldName : current === fieldName ? null : current
    );
    onUploadStateChange(fieldName, isUploading);
  };

  const hasFile = certificateType => !!certificates?.[certificateType]?.url;
  const addedOptions = options.filter(o => hasFile(o.key));
  const availableOptions = options.filter(o => !hasFile(o.key));

  // The upload of the selected type has finished: it is part of addedOptions
  // now, so reset the dropdown and let the technician pick the next one.
  if (selectedType && hasFile(selectedType)) {
    setSelectedType('');
  }
  const pendingOption = availableOptions.find(o => o.key === selectedType);
  const certificateFileRequired = validators.required(
    intl.formatMessage({ id: 'ProfileSettingsForm.certificateFileRequired' })
  );

  // Certifications as a whole are optional, but picking one from the dropdown
  // is a promise to upload its document: the field is required for as long as
  // the certification is selected, which keeps the form from being submitted.
  const renderUpload = ({ key, label }, validate) => (
    <FieldFileUpload
      key={key}
      id={`certificates.${key}`}
      name={`certificates.${key}`}
      label={label}
      hint={intl.formatMessage({ id: 'ProfileSettingsForm.documentFileInfo' })}
      storagePath={certificateStoragePath(currentUserId, key)}
      onUploadStateChange={handleUploadStateChange}
      validate={validate}
    />
  );

  return (
    <>
      {/* Note: not `.map(renderUpload)` - that would pass the array index as
          the second argument, i.e. as the validate function. */}
      {addedOptions.map(option => renderUpload(option))}

      {availableOptions.length > 0 ? (
        <div className={css.certificatePicker}>
          <label htmlFor="certificateTypeToAdd">
            <FormattedMessage id="ProfileSettingsForm.certificateTypeLabel" />
          </label>
          <select
            id="certificateTypeToAdd"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
          >
            <option value="">
              {intl.formatMessage({ id: 'ProfileSettingsForm.certificateTypePlaceholder' })}
            </option>
            {availableOptions.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {pendingOption ? (
            <>
              {renderUpload(pendingOption, certificateFileRequired)}
              <div className={css.pendingCertificateActions}>
                <button
                  className={css.clearCertificate}
                  type="button"
                  onClick={() => setSelectedType('')}
                >
                  <FormattedMessage id="ProfileSettingsForm.certificateClear" />
                </button>
                {uploadingField === `certificates.${pendingOption.key}` ? null : (
                  <span className={css.certificateError}>
                    <FormattedMessage id="ProfileSettingsForm.certificateFileRequired" />
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

/**
 * Profile information that is only asked from technicians (i.e. users whose
 * user type has the 'provider' role). Companies don't see this section.
 *
 * The service area and specialisations end up in publicData, so that companies
 * can see them. The uploaded documents end up in protectedData.
 *
 * @param {Object} props
 * @param {boolean} props.isTechnician - Whether the current user has the provider role
 * @param {string} props.currentUserId - UUID of the current user, used in the storage path
 * @param {Object} props.values - Current form values
 * @param {Function} props.onUploadStateChange - Called with (fieldName, isUploading)
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element|null}
 */
const TechnicianDetailsMaybe = props => {
  const { isTechnician, currentUserId, values, onUploadStateChange, intl } = props;
  const config = useConfiguration();

  if (!isTechnician || !currentUserId) {
    return null;
  }

  // Technicians pick their specialisations from the top-level listing
  // categories, and their certifications from the 'certifications' listing
  // field, so that both line up with the jobs companies post. Only the ids are
  // stored - the names are read from the config every time they are shown.
  const specialisationOptions = (config.categoryConfiguration?.categories || [])
    .filter(category => category?.id != null)
    .map(category => ({
      key: `${category.id}`,
      label: category.name || `${category.id}`,
    }));
  const certificateOptions = getCertificateTypeOptions(config);

  const documentFileInfo = intl.formatMessage({ id: 'ProfileSettingsForm.documentFileInfo' });
  const identityDocumentRequired = validators.required(
    intl.formatMessage({ id: 'ProfileSettingsForm.identityDocumentRequired' })
  );

  return (
    <>
      <div className={css.sectionContainer}>
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="ProfileSettingsForm.serviceAreaHeading" />
        </H4>
        <FieldTextInput
          type="textarea"
          id="serviceArea"
          name="serviceArea"
          label={intl.formatMessage({ id: 'ProfileSettingsForm.serviceAreaLabel' })}
          placeholder={intl.formatMessage({ id: 'ProfileSettingsForm.serviceAreaPlaceholder' })}
        />
      </div>

      {specialisationOptions.length > 0 ? (
        <div className={css.sectionContainer}>
          <H4 as="h2" className={css.sectionTitle}>
            <FormattedMessage id="ProfileSettingsForm.specialisationsHeading" />
          </H4>
          <FieldCheckboxGroup
            id="specialisations"
            name="specialisations"
            options={specialisationOptions}
            twoColumns
          />
          <p className={css.extraInfo}>
            <FormattedMessage id="ProfileSettingsForm.specialisationsInfo" />
          </p>
        </div>
      ) : null}

      <div className={css.sectionContainer}>
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="ProfileSettingsForm.documentsHeading" />
        </H4>
        <p className={css.documentsInfo}>
          <FormattedMessage id="ProfileSettingsForm.documentsInfo" />
        </p>
        <FieldFileUpload
          id="identityDocument"
          name="identityDocument"
          label={intl.formatMessage({ id: 'ProfileSettingsForm.identityDocumentLabel' })}
          hint={documentFileInfo}
          isRequired
          validate={identityDocumentRequired}
          storagePath={identityDocumentStoragePath(currentUserId)}
          onUploadStateChange={onUploadStateChange}
        />
        <FieldFileUpload
          id="insuranceDocument"
          name="insuranceDocument"
          label={intl.formatMessage({ id: 'ProfileSettingsForm.insuranceDocumentLabel' })}
          hint={documentFileInfo}
          storagePath={insuranceDocumentStoragePath(currentUserId)}
          onUploadStateChange={onUploadStateChange}
        />
      </div>

      {certificateOptions.length > 0 ? (
        <div className={css.sectionContainer}>
          <H4 as="h2" className={css.sectionTitle}>
            <FormattedMessage id="ProfileSettingsForm.certificatesHeading" />
          </H4>
          <p className={css.documentsInfo}>
            <FormattedMessage id="ProfileSettingsForm.certificatesInfo" />
          </p>
          <CertificateUploads
            options={certificateOptions}
            certificates={values?.certificates}
            currentUserId={currentUserId}
            onUploadStateChange={onUploadStateChange}
            intl={intl}
          />
        </div>
      ) : null}
    </>
  );
};

/**
 * ProfileSettingsForm
 * TODO: change to functional component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.formId] - The form id
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.userTypeConfig - The user type config
 * @param {string} props.userTypeConfig.userType - The user type
 * @param {Array<Object>} props.userFields - The user fields
 * @param {boolean} [props.isTechnician] - Whether the current user has the 'provider' role.
 * Technicians are additionally asked for their service area, specialisations and documents.
 * @param {Object} [props.profileImage] - The profile image
 * @param {string} props.marketplaceName - The marketplace name
 * @param {Function} props.onImageUpload - The function to handle image upload
 * @param {Function} props.onSubmit - The function to handle form submission
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @param {propTypes.error} [props.uploadImageError] - The upload image error
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} [props.updateProfileError] - The update profile error
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
class ProfileSettingsFormComponent extends Component {
  constructor(props) {
    super(props);

    this.uploadDelayTimeoutId = null;
    this.state = { uploadDelay: false, filesInProgress: [] };
    this.submittedValues = {};
    this.handleFileUploadStateChange = this.handleFileUploadStateChange.bind(this);
  }

  // Keeps track of the document uploads that are still in flight, so that the
  // form can't be submitted before their URLs have been stored as field values.
  handleFileUploadStateChange(fieldName, isUploading) {
    this.setState(prevState => {
      const others = prevState.filesInProgress.filter(name => name !== fieldName);
      const filesInProgress = isUploading ? [...others, fieldName] : others;
      return isEqual(filesInProgress, prevState.filesInProgress) ? null : { filesInProgress };
    });
  }

  componentDidUpdate(prevProps) {
    // Upload delay is additional time window where Avatar is added to the DOM,
    // but not yet visible (time to load image URL from srcset)
    if (prevProps.uploadInProgress && !this.props.uploadInProgress) {
      this.setState({ uploadDelay: true });
      this.uploadDelayTimeoutId = window.setTimeout(() => {
        this.setState({ uploadDelay: false });
      }, UPLOAD_CHANGE_DELAY);
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.uploadDelayTimeoutId);
  }

  render() {
    return (
      <FinalForm
        {...this.props}
        mutators={{ ...arrayMutators }}
        render={fieldRenderProps => {
          const {
            className,
            currentUser,
            handleSubmit,
            intl,
            invalid,
            onImageUpload,
            pristine,
            profileImage,
            rootClassName,
            updateInProgress,
            updateProfileError,
            uploadImageError,
            uploadInProgress,
            form,
            formId,
            marketplaceName,
            values,
            userFields,
            userTypeConfig,
            isTechnician,
          } = fieldRenderProps;

          const user = ensureCurrentUser(currentUser);

          // First name
          const firstNameLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNameLabel',
          });
          const firstNamePlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNamePlaceholder',
          });
          const firstNameRequiredMessage = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNameRequired',
          });
          const firstNameRequired = validators.required(firstNameRequiredMessage);

          // Last name
          const lastNameLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNameLabel',
          });
          const lastNamePlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNamePlaceholder',
          });
          const lastNameRequiredMessage = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNameRequired',
          });
          const lastNameRequired = validators.required(lastNameRequiredMessage);

          // Bio
          const bioLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.bioLabel',
          });
          const bioPlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.bioPlaceholder',
          });

          const uploadingOverlay =
            uploadInProgress || this.state.uploadDelay ? (
              <div className={css.uploadingImageOverlay}>
                <IconSpinner />
              </div>
            ) : null;

          const hasUploadError = !!uploadImageError && !uploadInProgress;
          const errorClasses = classNames({ [css.avatarUploadError]: hasUploadError });
          const transientUserProfileImage = profileImage.uploadedImage || user.profileImage;
          const transientUser = { ...user, profileImage: transientUserProfileImage };

          // Ensure that file exists if imageFromFile is used
          const fileExists = !!profileImage.file;
          const fileUploadInProgress = uploadInProgress && fileExists;
          const delayAfterUpload = profileImage.imageId && this.state.uploadDelay;
          const imageFromFile =
            fileExists && (fileUploadInProgress || delayAfterUpload) ? (
              <ImageFromFile
                id={profileImage.id}
                className={errorClasses}
                rootClassName={css.uploadingImage}
                aspectWidth={1}
                aspectHeight={1}
                file={profileImage.file}
              >
                {uploadingOverlay}
              </ImageFromFile>
            ) : null;

          // Avatar is rendered in hidden during the upload delay
          // Upload delay smoothes image change process:
          // responsive img has time to load srcset stuff before it is shown to user.
          const avatarClasses = classNames(errorClasses, css.avatar, {
            [css.avatarInvisible]: this.state.uploadDelay,
          });
          const avatarComponent =
            !fileUploadInProgress && profileImage.imageId ? (
              <Avatar
                className={avatarClasses}
                renderSizes="(max-width: 767px) 96px, 240px"
                user={transientUser}
                disableProfileLink
              />
            ) : null;

          const chooseAvatarLabel =
            profileImage.imageId || fileUploadInProgress ? (
              <div className={css.avatarContainer}>
                {imageFromFile}
                {avatarComponent}
                <div className={css.changeAvatar}>
                  <FormattedMessage id="ProfileSettingsForm.changeAvatar" />
                </div>
              </div>
            ) : (
              <div className={css.avatarPlaceholder}>
                <div className={css.avatarPlaceholderText}>
                  <FormattedMessage id="ProfileSettingsForm.addYourProfilePicture" />
                </div>
                <div className={css.avatarPlaceholderTextMobile}>
                  <FormattedMessage id="ProfileSettingsForm.addYourProfilePictureMobile" />
                </div>
              </div>
            );

          const submitError = updateProfileError ? (
            <div className={css.error}>
              <FormattedMessage id="ProfileSettingsForm.updateProfileFailed" />
            </div>
          ) : null;

          const classes = classNames(rootClassName || css.root, className);
          const submitInProgress = updateInProgress;
          const submittedOnce = Object.keys(this.submittedValues).length > 0;
          const pristineSinceLastSubmit = submittedOnce && isEqual(values, this.submittedValues);
          const documentUploadInProgress = this.state.filesInProgress.length > 0;
          const submitDisabled =
            invalid ||
            pristine ||
            pristineSinceLastSubmit ||
            uploadInProgress ||
            documentUploadInProgress ||
            submitInProgress;

          const userFieldProps = getPropsForCustomUserFieldInputs(
            userFields,
            userTypeConfig?.userType,
            false
          );

          return (
            <Form
              className={classes}
              onSubmit={e => {
                this.submittedValues = values;
                handleSubmit(e);
              }}
            >
              <div className={css.sectionContainer}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.yourProfilePicture" />
                </H4>
                <Field
                  accept={ACCEPT_IMAGES}
                  id="profileImage"
                  name="profileImage"
                  label={chooseAvatarLabel}
                  type="file"
                  form={null}
                  uploadImageError={uploadImageError}
                  disabled={uploadInProgress}
                >
                  {fieldProps => {
                    const { accept, id, input, label, disabled, uploadImageError } = fieldProps;
                    const { name, type } = input;
                    const onChange = e => {
                      const file = e.target.files[0];
                      form.change(`profileImage`, file);
                      form.blur(`profileImage`);
                      if (file != null) {
                        const tempId = `${file.name}_${Date.now()}`;
                        onImageUpload({ id: tempId, file });
                      }
                    };

                    let error = null;

                    if (isUploadImageOverLimitError(uploadImageError)) {
                      error = (
                        <div className={css.error}>
                          <FormattedMessage id="ProfileSettingsForm.imageUploadFailedFileTooLarge" />
                        </div>
                      );
                    } else if (uploadImageError) {
                      error = (
                        <div className={css.error}>
                          <FormattedMessage id="ProfileSettingsForm.imageUploadFailed" />
                        </div>
                      );
                    }

                    return (
                      <div className={css.uploadAvatarWrapper}>
                        <label className={css.label} htmlFor={id}>
                          {label}
                        </label>
                        <input
                          accept={accept}
                          id={id}
                          name={name}
                          className={css.uploadAvatarInput}
                          disabled={disabled}
                          onChange={onChange}
                          type={type}
                        />
                        {error}
                      </div>
                    );
                  }}
                </Field>
                <div className={css.tip}>
                  <FormattedMessage id="ProfileSettingsForm.tip" />
                </div>
                <div className={css.fileInfo}>
                  <FormattedMessage id="ProfileSettingsForm.fileInfo" />
                </div>
              </div>
              <div className={css.sectionContainer}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.yourName" />
                </H4>
                <div className={css.nameContainer}>
                  <FieldTextInput
                    className={css.firstName}
                    type="text"
                    id="firstName"
                    name="firstName"
                    label={firstNameLabel}
                    placeholder={firstNamePlaceholder}
                    validate={firstNameRequired}
                  />
                  <FieldTextInput
                    className={css.lastName}
                    type="text"
                    id="lastName"
                    name="lastName"
                    label={lastNameLabel}
                    placeholder={lastNamePlaceholder}
                    validate={lastNameRequired}
                  />
                </div>
              </div>

              <DisplayNameMaybe userTypeConfig={userTypeConfig} intl={intl} />

              <div className={classNames(css.sectionContainer)}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.bioHeading" />
                </H4>
                <FieldTextInput
                  type="textarea"
                  id="bio"
                  name="bio"
                  label={bioLabel}
                  placeholder={bioPlaceholder}
                />
                <p className={css.extraInfo}>
                  <FormattedMessage id="ProfileSettingsForm.bioInfo" values={{ marketplaceName }} />
                </p>
              </div>
              <TechnicianDetailsMaybe
                isTechnician={isTechnician}
                currentUserId={user.id?.uuid}
                values={values}
                onUploadStateChange={this.handleFileUploadStateChange}
                intl={intl}
              />

              <div className={classNames(css.sectionContainer, css.lastSection)}>
                {userFieldProps.map(({ key, ...fieldProps }) => (
                  <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                ))}
              </div>
              {submitError}
              <Button
                className={css.submitButton}
                type="submit"
                inProgress={submitInProgress}
                disabled={submitDisabled}
                ready={pristineSinceLastSubmit}
              >
                <FormattedMessage id="ProfileSettingsForm.saveChanges" />
              </Button>
            </Form>
          );
        }}
      />
    );
  }
}

const ProfileSettingsForm = compose(injectIntl)(ProfileSettingsFormComponent);

ProfileSettingsForm.displayName = 'ProfileSettingsForm';

export default ProfileSettingsForm;
