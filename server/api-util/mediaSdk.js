const { S3Client } = require('@aws-sdk/client-s3');
const mediaConfig = require('../config/media');

let r2Client = null;

exports.getR2Client = () => {
  if (!r2Client) {
    const { accessKeyId, secretAccessKey, endpoint, region } = mediaConfig.r2;

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error('R2 credentials are not properly configured');
    }

    r2Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
};
