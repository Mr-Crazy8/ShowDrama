const { S3Client } = require('@aws-sdk/client-s3');

const accountId = process.env.R2_ACCOUNT_ID || 'placeholder-account-id';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'placeholder-key';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'placeholder-secret';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

module.exports = r2Client;
