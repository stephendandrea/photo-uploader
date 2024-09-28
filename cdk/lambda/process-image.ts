import { S3 } from 'aws-sdk';
import { Jimp, JimpMime } from 'jimp';

exports.handler = async (event: any) => {
  const body = JSON.parse(event.Records[0].body);
  console.log('Process image from queue', body);

  const s3 = new S3({ region: 'us-east-1' });

  console.log('bucket', body.bucket?.name);
  console.log('Key', body.object?.key);

  const image = await s3
    .getObject({
      Bucket: body.bucket?.name,
      Key: body.object?.key,
    })
    .promise();

  const jimpImage = await Jimp.read(image.Body);
  const newImage = await jimpImage.greyscale().getBuffer(JimpMime.png);

  await s3
    .putObject({
      Body: newImage,
      Bucket: body.bucket?.name,
      Key: 'bw-' + body.object?.key,
    })
    .promise();
};
