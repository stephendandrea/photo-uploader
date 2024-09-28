import { S3 } from 'aws-sdk';
import { Jimp, JimpMime } from 'jimp';

// const convert = require('heic-convert');

exports.handler = async (event: any) => {
  const body = JSON.parse(event.Records[0].body);
  const s3 = new S3({ region: 'us-east-1' });

  console.log(`Process image from queue. Filename: ${body.object?.key}`);

  const image = await s3
    .getObject({
      Bucket: body.bucket?.name,
      Key: body.object?.key,
    })
    .promise();

  const jimpImage = await Jimp.read(image.Body as Buffer);
  console.log({ jimpImage });

  const newImage = await jimpImage.greyscale().getBuffer(JimpMime.png);
  console.log({ newImage });

  await s3
    .putObject({
      Body: newImage,
      Bucket: body.bucket?.name,
      Key: 'bw-' + body.object?.key,
    })
    .promise();
};
