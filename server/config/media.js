/**
 * Media configuration for file uploads and storage
 * Centralizes settings for R2/S3 storage and file validation
 */

const {
  R2_BUCKET_NAME,
  R2_PUBLIC_DOMAIN,
  R2_URL_EXPIRATION,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

const DEFAULT_MAX_FILE_SIZE = 10485760; // 10MB
const MAX_IMAGE_SIZE = 5242880; // 5MB
const MAX_VIDEO_SIZE = 104857600; // 100MB

module.exports = {
  r2: {
    bucketName: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_DOMAIN,
    urlExpiration: R2_URL_EXPIRATION, // 5 minutes default
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  // Allowed file types by category
  allowedFileTypes: {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf',
    ],
  },
  // File size limits by category (in bytes)
  maxFileSizeByCategory: {
    image: MAX_IMAGE_SIZE, // 5MB
    video: MAX_VIDEO_SIZE, // 100MB
    document: MAX_IMAGE_SIZE, // 5MB
  },
  // Storage paths
  storagePaths: {
    listings: 'listings',
    profiles: 'profiles',
    messages: 'messages',
    certifications: 'certifications',
    temp: 'temp',
  },
  // Security settings
  security: {
    allowedFileNamePattern: /^[a-zA-Z0-9._-]+$/,
    maxFileNameLength: 255,
    sanitizeFileNames: true,
    preventOverwrite: true, // Add timestamp to prevent overwriting
  },
};
