import React, { useEffect, useRef, useState } from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { calculateFileSize } from '../../util/fileHelpers';
import {
  ACCEPTED_DOCUMENT_TYPES,
  FILE_TOO_LARGE_ERROR,
  INVALID_FILE_TYPE_ERROR,
  MAX_DOCUMENT_FILE_SIZE,
  UPLOAD_FAILED_ERROR,
  uploadFileToStorage,
  validateFile,
} from '../../util/storageUpload';
import { FileName, ValidationError } from '../../components';

import { IconCheck } from '../FileUpload/IconCheck';
import { IconCross } from '../FileUpload/IconCross';
import { IconError } from '../FileUpload/IconError';
import { IconSpinner } from '../FileUpload/IconSpinner';

import css from './FieldFileUpload.module.css';

const IDLE = 'idle';
const UPLOADING = 'uploading';
const FAILED = 'failed';

const initialUploadState = { status: IDLE, progress: null, error: null, fileName: null };

const UploadErrorMessage = props => {
  const { error, maxSize, intl } = props;
  const maxSizeText = calculateFileSize(maxSize, intl.locale);

  return error === FILE_TOO_LARGE_ERROR ? (
    <FormattedMessage id="FieldFileUpload.fileTooLarge" values={{ maxSize: maxSizeText }} />
  ) : error === INVALID_FILE_TYPE_ERROR ? (
    <FormattedMessage id="FieldFileUpload.invalidFileType" />
  ) : (
    <FormattedMessage id="FieldFileUpload.uploadFailed" />
  );
};

const FieldFileUploadComponent = props => {
  const {
    rootClassName,
    className,
    id,
    label,
    hint,
    isRequired,
    disabled,
    accept = ACCEPTED_DOCUMENT_TYPES,
    acceptedMimeTypes,
    maxSize = MAX_DOCUMENT_FILE_SIZE,
    storagePath,
    onUploadStateChange,
    input,
    meta,
  } = props;
  const intl = useIntl();
  const [uploadState, setUploadState] = useState(initialUploadState);

  const { name, value, onChange, onBlur } = input;
  const isUploading = uploadState.status === UPLOADING;

  // Let the enclosing form know that a file is in flight, so that it can
  // keep the submit button disabled until the upload has finished.
  // The callback is kept in a ref so that an inline arrow function given as a
  // prop doesn't re-trigger the effect on every render.
  const onUploadStateChangeRef = useRef(onUploadStateChange);
  onUploadStateChangeRef.current = onUploadStateChange;

  useEffect(() => {
    onUploadStateChangeRef.current?.(name, isUploading);
  }, [name, isUploading]);
  useEffect(() => () => onUploadStateChangeRef.current?.(name, false), [name]);

  const handleChange = e => {
    const file = e.target.files?.[0];
    // Reset the input so that picking the same file again still fires onChange
    e.target.value = '';

    if (!file) {
      return;
    }

    const fileError = validateFile(file, { acceptedMimeTypes, maxSize });
    if (fileError) {
      setUploadState({
        ...initialUploadState,
        status: FAILED,
        error: fileError,
        fileName: file.name,
      });
      onBlur();
      return;
    }

    setUploadState({ status: UPLOADING, progress: 0, error: null, fileName: file.name });

    uploadFileToStorage({
      file,
      storagePath,
      onProgress: progress => setUploadState(prevState => ({ ...prevState, progress })),
    })
      .then(uploadedFile => {
        setUploadState(initialUploadState);
        onChange(uploadedFile);
        onBlur();
      })
      .catch(e => {
        setUploadState({
          ...initialUploadState,
          status: FAILED,
          error: e.message || UPLOAD_FAILED_ERROR,
          fileName: file.name,
        });
        onBlur();
      });
  };

  const handleRemove = () => {
    setUploadState(initialUploadState);
    onChange(null);
    onBlur();
  };

  const hasFile = !!value?.url;
  const inputId = id || name;
  const classes = classNames(rootClassName || css.root, className);

  const uploadButton = (
    <label className={css.uploadButton} htmlFor={inputId}>
      {hasFile ? (
        <FormattedMessage id="FieldFileUpload.replaceFile" />
      ) : (
        <FormattedMessage id="FieldFileUpload.chooseFile" />
      )}
    </label>
  );

  const fileRow = isUploading ? (
    <div className={css.fileRow}>
      <IconSpinner />
      <div className={css.fileInfo}>
        <FileName name={uploadState.fileName} />
        <span className={css.statusText}>
          <FormattedMessage
            id="FieldFileUpload.uploading"
            values={{ progress: uploadState.progress ?? 0 }}
          />
        </span>
      </div>
    </div>
  ) : hasFile ? (
    <div className={css.fileRow}>
      <IconCheck />
      <div className={css.fileInfo}>
        <a className={css.fileLink} href={value.url} target="_blank" rel="noopener noreferrer">
          <FileName name={value.name} />
        </a>
        {value.size ? (
          <span className={css.statusText}>{calculateFileSize(value.size, intl.locale)}</span>
        ) : null}
      </div>
      <button
        className={css.removeButton}
        type="button"
        onClick={handleRemove}
        disabled={disabled}
        aria-label={intl.formatMessage(
          { id: 'FieldFileUpload.removeFile' },
          { fileName: value.name }
        )}
      >
        <IconCross />
      </button>
    </div>
  ) : null;

  const uploadError =
    uploadState.status === FAILED ? (
      <div className={classNames(css.fileRow, css.failed)}>
        <IconError />
        <div className={css.fileInfo}>
          <FileName name={uploadState.fileName} />
          <span className={css.errorText}>
            <UploadErrorMessage error={uploadState.error} maxSize={maxSize} intl={intl} />
          </span>
        </div>
      </div>
    ) : null;

  return (
    <div className={classes}>
      <div className={css.labelRow}>
        <span className={css.label}>{label}</span>
        <span className={css.badge}>
          {isRequired ? (
            <FormattedMessage id="FieldFileUpload.required" />
          ) : (
            <FormattedMessage id="FieldFileUpload.optional" />
          )}
        </span>
      </div>

      {fileRow}
      {uploadError}

      <div className={css.actions}>
        <input
          className={css.input}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled || isUploading}
          onChange={handleChange}
          // The visible <label> below is the upload button, so the input gets
          // its accessible name from the heading of the field instead.
          aria-label={typeof label === 'string' ? label : undefined}
        />
        {isUploading ? null : uploadButton}
        {hint ? <span className={css.hint}>{hint}</span> : null}
      </div>

      <ValidationError fieldMeta={meta} />
    </div>
  );
};

/**
 * A Final Form field that uploads a single file to the marketplace's own file
 * storage (through the presigned URL endpoint) and stores a descriptor of the
 * uploaded file as the field value:
 *
 *   { name, key, url, size, mimeType, uploadedAt }
 *
 * The file is uploaded as soon as it is picked; the form submit only saves the
 * descriptor. Removing a file sets the value to null - it doesn't delete the
 * object from storage.
 *
 * @component
 * @param {Object} props
 * @param {string} props.name name of the field (required by Final Form)
 * @param {string} [props.id] id given to the file input, defaults to name
 * @param {string} props.storagePath directory in the bucket, e.g. 'profiles/<uuid>/identity'
 * @param {ReactNode} props.label label shown above the field. Also the accessible
 * name of the file input.
 * @param {ReactNode} [props.hint] extra info shown next to the upload button
 * @param {boolean} [props.isRequired] shows a "Required"/"Optional" badge. Note: this only
 * affects the badge - pass a `validate` function to actually require a value.
 * @param {boolean} [props.disabled]
 * @param {string} [props.accept] accept attribute of the file input
 * @param {Array<string>} [props.acceptedMimeTypes] MIME types accepted in validation
 * @param {number} [props.maxSize] max file size in bytes
 * @param {Function} [props.onUploadStateChange] called with (name, isUploading)
 * @param {Function} [props.validate] Final Form field-level validation
 * @param {string} [props.rootClassName]
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
const FieldFileUpload = props => <Field component={FieldFileUploadComponent} {...props} />;

export default FieldFileUpload;
