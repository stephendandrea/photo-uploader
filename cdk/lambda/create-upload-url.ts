import { S3 } from 'aws-sdk';
import { snakeCase } from 'lodash';

exports.handler = async (event: any) => {
  try {
    const s3 = new S3({ region: 'us-east-1' });

    const [name, ext] = event.queryStringParameters.key.split('.');
    const url = s3.createPresignedPost({
      Bucket: process.env.BUCKET_NAME!,
      Fields: { Key: `${snakeCase(name)}.${ext}` },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(url),
      isBase64Encoded: false,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
        'Access-Control-Allow-Credentials': 'true', // Required for cookies, authorization headers with HTTPS
        'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
      },
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify(e),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
        'Access-Control-Allow-Credentials': 'true', // Required for cookies, authorization headers with HTTPS
        'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
      },
    };
  }
};
