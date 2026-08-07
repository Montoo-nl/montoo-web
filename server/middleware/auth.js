const { getTrustedSdk, handleError } = require('../api-util/sdk');

/**
 * Authenticates a user and returns the current user data
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Returns an object with { currentUser, userId } if authenticated
 * @throws {Error} Throws error if authentication fails
 */
async function authenticateUser(req) {
  const trustedSdk = await getTrustedSdk(req);
  const userResponse = await trustedSdk.currentUser.show();
  const currentUser = userResponse?.data?.data;

  if (!currentUser) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  return {
    currentUser,
    userId: currentUser.id.uuid,
  };
}

async function auth(req, res, next) {
  try {
    const { userId } = await authenticateUser(req);
    req.tokenUserId = userId;
    next();
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = auth;
