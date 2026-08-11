// Helpers for uploading a file from the browser straight to the marketplace's
// own file storage. The flow is:
//   1. ask our backend for a presigned URL (server/api/presigned-url.js)
//   2. PUT the file to that URL
//   3. store the returned public URL / storage key in extended data
//
// Note: files uploaded this way are *not* Marketplace API file resources, so
// they are not scanned or access-controlled by Sharetribe. Access control is
// whatever the storage bucket provides.

import { getPresignedUploadUrls } from './api';

// Documents that a technician can upload as proof (identity, insurance,
// certificates). Kept in sync with `allowedFileTypes` in server/config/media.js.
export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

// Value for the `accept` attribute of a file input.
export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.jpg,.jpeg,.png';

// Images a technician shows off their work with. Kept in sync with
// `allowedFileTypes.image` in server/config/media.js.
export const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ACCEPTED_IMAGE_TYPES = '.jpg,.jpeg,.png,.webp';

// The presigned URL endpoint doesn't enforce a size limit, so the browser has
// to. 5MB matches `maxFileSizeByCategory.document` in server/config/media.js.
export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;

// Error messages thrown by validateFile. FieldFileUpload maps these to
// translated strings.
export const FILE_TOO_LARGE_ERROR = 'fileTooLarge';
export const INVALID_FILE_TYPE_ERROR = 'invalidFileType';
export const UPLOAD_FAILED_ERROR = 'uploadFailed';

/**
 * Check that a browser File can be uploaded.
 *
 * @param {File} file file picked by the user
 * @param {Object} options
 * @param {Array<string>} [options.acceptedMimeTypes] allowed MIME types
 * @param {number} [options.maxSize] max size in bytes
 * @returns {string|null} one of the *_ERROR constants, or null when the file is valid
 */
export const validateFile = (file, options = {}) => {
  const {
    acceptedMimeTypes = ACCEPTED_DOCUMENT_MIME_TYPES,
    maxSize = MAX_DOCUMENT_FILE_SIZE,
  } = options;

  if (!file) {
    return UPLOAD_FAILED_ERROR;
  }
  if (!acceptedMimeTypes.includes(file.type)) {
    return INVALID_FILE_TYPE_ERROR;
  }
  if (file.size > maxSize) {
    return FILE_TOO_LARGE_ERROR;
  }
  return null;
};

// PUT the file to the presigned URL. XMLHttpRequest is used instead of fetch,
// because fetch can't report upload progress.
const putFile = (url, file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    // The presigned URL is signed with the content type, so it has to match.
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = e => {
        const progress = e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : null;
        onProgress(progress);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(UPLOAD_FAILED_ERROR));
      }
    };
    xhr.onerror = () => reject(new Error(UPLOAD_FAILED_ERROR));
    xhr.onabort = () => reject(new Error(UPLOAD_FAILED_ERROR));

    xhr.send(file);
  });

/**
 * Upload a single file to the marketplace's file storage.
 *
 * @param {Object} params
 * @param {File} params.file file picked by the user
 * @param {string} params.storagePath directory in the bucket, e.g. 'profiles/<uuid>/identity'
 * @param {Function} [params.onProgress] called with a number between 0 and 100
 * @returns {Promise<Object>} { name, key, url, size, mimeType, uploadedAt } - safe to save as extended data
 */
export const uploadFileToStorage = ({ file, storagePath, onProgress }) => {
  const body = { storagePath, files: [{ name: file.name, type: file.type }] };

  return getPresignedUploadUrls(body)
    .then(response => {
      const fileInfo = response?.data?.[0];
      if (!response?.success || !fileInfo?.url) {
        throw new Error(UPLOAD_FAILED_ERROR);
      }
      return fileInfo;
    })
    .then(fileInfo =>
      putFile(fileInfo.url, file, onProgress).then(() => ({
        name: file.name,
        key: fileInfo.key,
        url: fileInfo.publicUrl,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      }))
    );
};
