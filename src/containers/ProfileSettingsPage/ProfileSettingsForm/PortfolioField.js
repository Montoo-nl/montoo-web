import React, { useEffect, useRef, useState } from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  ACCEPTED_IMAGE_TYPES,
  FILE_TOO_LARGE_ERROR,
  INVALID_FILE_TYPE_ERROR,
  UPLOAD_FAILED_ERROR,
  uploadFileToStorage,
  validateFile,
} from '../../../util/storageUpload';

import css from './PortfolioField.module.css';

// How many images a technician can show. More than this and the profile page
// turns into a gallery rather than a profile.
export const MAX_PORTFOLIO_IMAGES = 10;

// Raised when more files are picked than there is room left for.
const TOO_MANY_IMAGES_ERROR = 'tooManyImages';

const hasText = value => !!value?.trim();

/**
 * Every image has to say what the work was and where it was done - the profile
 * shows both under the photo, and a caption-less tile tells a company nothing.
 *
 * Validates the whole array in one go, because the caption and city live on the
 * image descriptors rather than being fields of their own.
 *
 * @param {string} message shown when any image is missing either
 * @returns {Function} a Final Form field validator
 */
export const portfolioDetailsRequired = message => value =>
  (value || []).some(image => !hasText(image?.title) || !hasText(image?.city))
    ? message
    : undefined;

const ErrorMessage = props => {
  const { error } = props;

  return error === FILE_TOO_LARGE_ERROR ? (
    <FormattedMessage id="ProfileSettingsForm.portfolioTooLarge" />
  ) : error === INVALID_FILE_TYPE_ERROR ? (
    <FormattedMessage id="ProfileSettingsForm.portfolioInvalidType" />
  ) : error === TOO_MANY_IMAGES_ERROR ? (
    <FormattedMessage
      id="ProfileSettingsForm.portfolioFull"
      values={{ maxImages: MAX_PORTFOLIO_IMAGES }}
    />
  ) : (
    <FormattedMessage id="ProfileSettingsForm.portfolioUploadFailed" />
  );
};

const PortfolioFieldComponent = props => {
  const { id, storagePath, disabled, onUploadStateChange, input, meta } = props;
  const { name, value, onChange, onBlur } = input;
  const intl = useIntl();

  // Hold the missing-details message back until the technician has actually
  // been near the field, so a fresh upload isn't red before they can type.
  const showDetailErrors = !!(meta?.touched || meta?.submitFailed);

  // Images that have finished uploading. Anything still on its way lives in
  // `pending` until its URL is known.
  const images = Array.isArray(value) ? value : [];
  const [pending, setPending] = useState([]);
  const [errors, setErrors] = useState([]);

  // Uploads finish independently, so appending to the `images` captured by a
  // closure would drop whichever one resolved second. The ref always holds the
  // current value.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const isUploading = pending.length > 0;
  const onUploadStateChangeRef = useRef(onUploadStateChange);
  onUploadStateChangeRef.current = onUploadStateChange;

  useEffect(() => {
    onUploadStateChangeRef.current?.(name, isUploading);
  }, [name, isUploading]);
  useEffect(() => () => onUploadStateChangeRef.current?.(name, false), [name]);

  const handleChange = e => {
    const files = Array.from(e.target.files || []);
    // Reset the input so that picking the same file again still fires onChange
    e.target.value = '';

    if (files.length === 0) {
      return;
    }

    const room = MAX_PORTFOLIO_IMAGES - imagesRef.current.length - pending.length;
    const accepted = files.slice(0, Math.max(room, 0));
    const overflowError = files.length > accepted.length ? [TOO_MANY_IMAGES_ERROR] : [];

    const validated = accepted.map(file => ({
      file,
      error: validateFile(file, { acceptedMimeTypes: ACCEPTED_IMAGE_MIME_TYPES }),
    }));

    setErrors([...overflowError, ...validated.filter(v => v.error).map(v => v.error)]);

    const uploadable = validated.filter(v => !v.error);
    if (uploadable.length === 0) {
      return;
    }

    const started = uploadable.map(({ file }) => ({
      tempId: `${file.name}_${Date.now()}_${Math.random()}`,
      name: file.name,
      file,
    }));
    setPending(current => [...current, ...started]);

    started.forEach(({ tempId, file }) => {
      uploadFileToStorage({ file, storagePath })
        .then(uploadedImage => {
          onChange([...imagesRef.current, uploadedImage]);
          onBlur();
        })
        .catch(uploadError => {
          setErrors(current => [...current, uploadError.message || UPLOAD_FAILED_ERROR]);
        })
        .finally(() => {
          setPending(current => current.filter(p => p.tempId !== tempId));
        });
    });
  };

  const handleRemove = removedKey => {
    onChange(imagesRef.current.filter(image => image.key !== removedKey));
    onBlur();
  };

  // The caption and city are stored on the image descriptor itself, so that the
  // profile page can show what each photo is without a second lookup.
  const handleDetailChange = (imageKey, field, fieldValue) => {
    onChange(
      imagesRef.current.map(image =>
        image.key === imageKey ? { ...image, [field]: fieldValue } : image
      )
    );
  };

  const isFull = images.length + pending.length >= MAX_PORTFOLIO_IMAGES;

  return (
    <div className={css.root}>
      <ul className={css.grid}>
        {images.map(image => (
          <li key={image.key} className={css.item}>
            <div className={css.imageWrapper}>
              <img className={css.image} src={image.url} alt={image.title || image.name} />
              <button
                className={css.removeButton}
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(image.key)}
              >
                <FormattedMessage
                  id="ProfileSettingsForm.portfolioRemove"
                  values={{ fileName: image.name }}
                />
              </button>
            </div>

            {/* Plain inputs rather than form fields of their own: these belong
                to the image descriptor, so they are edited in the array this
                field already owns. */}
            <div className={css.details}>
              <input
                className={classNames(css.detailInput, {
                  [css.detailInputError]: showDetailErrors && !hasText(image.title),
                })}
                type="text"
                value={image.title || ''}
                disabled={disabled}
                placeholder={intl.formatMessage({
                  id: 'ProfileSettingsForm.portfolioTitlePlaceholder',
                })}
                aria-label={intl.formatMessage({ id: 'ProfileSettingsForm.portfolioTitleLabel' })}
                onChange={e => handleDetailChange(image.key, 'title', e.target.value)}
                onBlur={onBlur}
              />
              <input
                className={classNames(css.detailInput, {
                  [css.detailInputError]: showDetailErrors && !hasText(image.city),
                })}
                type="text"
                value={image.city || ''}
                disabled={disabled}
                placeholder={intl.formatMessage({
                  id: 'ProfileSettingsForm.portfolioCityPlaceholder',
                })}
                aria-label={intl.formatMessage({ id: 'ProfileSettingsForm.portfolioCityLabel' })}
                onChange={e => handleDetailChange(image.key, 'city', e.target.value)}
                onBlur={onBlur}
              />
            </div>
          </li>
        ))}

        {pending.map(({ tempId, name: fileName }) => (
          <li key={tempId} className={classNames(css.item, css.itemPending)}>
            <span className={css.pendingLabel}>
              <FormattedMessage id="ProfileSettingsForm.portfolioUploading" />
            </span>
            <span className={css.pendingName}>{fileName}</span>
          </li>
        ))}
      </ul>

      <div className={css.actions}>
        <input
          className={css.input}
          id={id || name}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          disabled={disabled || isFull}
          onChange={handleChange}
        />
        <label
          className={classNames(css.addButton, { [css.addButtonDisabled]: isFull })}
          htmlFor={id || name}
        >
          <FormattedMessage id="ProfileSettingsForm.portfolioAdd" />
        </label>
        <span className={css.hint}>
          <FormattedMessage
            id="ProfileSettingsForm.portfolioFileInfo"
            values={{ count: images.length, maxImages: MAX_PORTFOLIO_IMAGES }}
          />
        </span>
      </div>

      {showDetailErrors && meta?.error ? <p className={css.error}>{meta.error}</p> : null}

      {errors.map((error, index) => (
        <p key={`${error}_${index}`} className={css.error}>
          <ErrorMessage error={error} />
        </p>
      ))}
    </div>
  );
};

/**
 * A gallery of the technician's best work, uploaded to the marketplace's own
 * file storage. Up to MAX_PORTFOLIO_IMAGES images, each removable.
 *
 * The field value is an array of the descriptors uploadFileToStorage returns:
 *   [{ name, key, url, size, mimeType, uploadedAt }]
 *
 * Images are uploaded as soon as they are picked; the form submit only saves
 * the descriptors. Removing an image takes it out of the array - it doesn't
 * delete the object from storage.
 *
 * @component
 * @param {Object} props
 * @param {string} props.name - Name of the field in Final Form
 * @param {string} [props.id] - Id given to the file input, defaults to name
 * @param {string} props.storagePath - Directory in the bucket
 * @param {boolean} [props.disabled]
 * @param {Function} [props.onUploadStateChange] - Called with (name, isUploading)
 * @returns {JSX.Element}
 */
const PortfolioField = props => <Field component={PortfolioFieldComponent} {...props} />;

export default PortfolioField;
