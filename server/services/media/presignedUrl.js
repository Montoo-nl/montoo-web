const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { getR2Client } = require('../../api-util/mediaSdk');
const mediaConfig = require('../../config/media');

// Configuration
const CONFIG = {
  BUCKET_NAME: mediaConfig.r2.bucketName,
  PUBLIC_URL: mediaConfig.r2.publicUrl,
  URL_EXPIRATION: mediaConfig.r2.urlExpiration,
  MAX_FILE_SIZE: mediaConfig.r2.maxFileSize,
};

// Allowed file types by category
const ALLOWED_FILE_TYPES = mediaConfig.allowedFileTypes;

// Cache for file type lookups
const FILE_TYPE_CACHE = new Map();

/**
 * Determines file category based on MIME type
 * @param {string} mimetype - File MIME type
 * @returns {string|null} File category or null if unsupported
 */
const getFileCategory = mimetype => {
  if (FILE_TYPE_CACHE.has(mimetype)) {
    return FILE_TYPE_CACHE.get(mimetype);
  }

  for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (types.includes(mimetype)) {
      FILE_TYPE_CACHE.set(mimetype, category);
      return category;
    }
  }
  FILE_TYPE_CACHE.set(mimetype, null);
  return null; // Return null for unsupported types
};

/**
 * Sanitizes filename to prevent security issues
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = filename => {
  // Remove path components and dangerous characters
  return filename
    .replace(/^.*[\\\/]/, '') // Remove path
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars
    .substring(0, 255); // Limit length
};

/**
 * Validates file data
 * @param {Object} fileData - File data object
 * @throws {Error} If validation fails
 */
const validateFileData = fileData => {
  if (!fileData || typeof fileData !== 'object') {
    const error = new Error('Invalid file data');
    error.status = 400;
    throw error;
  }

  const { name, type } = fileData;

  if (!name || typeof name !== 'string') {
    const error = new Error('File name is required');
    error.status = 400;
    throw error;
  }

  if (!type || typeof type !== 'string') {
    const error = new Error('File type is required');
    error.status = 400;
    throw error;
  }

  const category = getFileCategory(type);
  if (!category) {
    const error = new Error(
      `Invalid file type: ${type}. Allowed types: ${Object.values(ALLOWED_FILE_TYPES)
        .flat()
        .join(', ')}`
    );
    error.status = 400;
    throw error;
  }
};

/**
 * Generates a presigned URL for uploading a single file to R2
 * @param {Object} fileData - File data object
 * @param {string} fileData.name - File name
 * @param {string} fileData.type - MIME type
 * @param {string} storagePath - Storage path (without leading/trailing slashes)
 * @returns {Promise<Object>} Presigned URL and file information
 * @throws {Error} If file validation fails or URL generation fails
 */
const create = async (fileData, storagePath) => {
  try {
    // Validate file data
    validateFileData(fileData);

    const R2 = getR2Client();
    const { name, type } = fileData;

    const sanitizedName = sanitizeFilename(name);
    const fileCategory = getFileCategory(type);

    // Create unique key with timestamp and UUID to prevent overwrites
    const key = `${storagePath}/${uuidv4()}-${sanitizedName}`;

    // Generate presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: CONFIG.BUCKET_NAME,
      Key: key,
      ContentType: type,
      Metadata: {
        originalname: sanitizedName,
        category: fileCategory,
        uploadedAt: new Date().toISOString(),
      },
    });

    const signedUrl = await getSignedUrl(R2, command, {
      expiresIn: CONFIG.URL_EXPIRATION,
    });

    // Construct public URL
    const publicUrl = `${CONFIG.PUBLIC_URL}/${key}`;

    return {
      success: true,
      url: signedUrl, // Presigned URL for uploading
      publicUrl, // Public URL for accessing the file after upload
      key,
    };
  } catch (error) {
    console.error('Error creating presigned URL:', {
      fileName: fileData?.name,
      storagePath,
      errorMessage: error.message,
    });
    throw error;
  }
};

module.exports = {
  create,
};
