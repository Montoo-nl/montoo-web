const { mediaServices } = require('../services');

/**
 * Validates request body and throws errors if invalid
 * @param {Object} body - Request body
 * @throws {Error} If validation fails
 */
const validateRequest = body => {
  const { storagePath, files } = body;

  if (!storagePath || typeof storagePath !== 'string') {
    const error = new Error('Valid storagePath is required');
    error.status = 400;
    throw error;
  }

  // Check for path traversal attempts
  if (storagePath.includes('..') || storagePath.startsWith('/')) {
    const error = new Error('Invalid storagePath format');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(files) || files.length === 0) {
    const error = new Error('Files array is required and must not be empty');
    error.status = 400;
    throw error;
  }
};

/**
 * Generates presigned URLs for uploading files to R2
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generatePresignedUrl = async (req, res) => {
  try {
    const { storagePath, files } = req.body;

    // Validate request
    validateRequest(req.body);

    // Generate presigned URLs for all files in parallel
    const fileInfos = await Promise.all(files.map(file => mediaServices.create(file, storagePath)));

    return res.status(200).json({
      success: true,
      data: fileInfos,
    });
  } catch (error) {
    console.error('Error generating presigned URLs:', error.message);

    // Use error status if provided, otherwise default to 500
    const statusCode = error.status || 500;
    const errorMessage = error.status ? error.message : 'Failed to generate presigned URL';

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
};

module.exports = generatePresignedUrl;
