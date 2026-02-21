const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadPrescriptionToS3(imageBuffer, mimeType, userId) {
  if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS no configurado — faltan credenciales');
  }

  const extension = mimeType.split('/')[1] || 'jpg';
  const timestamp = Date.now();
  const hash = crypto.randomBytes(6).toString('hex');
  const key = `prescriptions/${userId}/${timestamp}-${hash}.${extension}`;

  await s3.send(new PutObjectCommand({
    Bucket: config.AWS_S3_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: mimeType,
  }));

  const url = `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
  logger.info(`Imagen subida a S3: ${key}`);
  return url;
}

module.exports = { uploadPrescriptionToS3 };