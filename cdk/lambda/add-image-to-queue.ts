import { SQS } from 'aws-sdk';

exports.handler = async (event: any) => {
  console.log(event.Records[0].s3);
  console.log('Attempting to add image to queue', event.Records[0].s3);
  // write image url to db

  const sqs = new SQS({ region: 'us-east-1' });

  const params = {
    DelaySeconds: 2,
    MessageBody: JSON.stringify(event.Records[0].s3),
    QueueUrl: process.env.QUEUE_URL!,
  };

  try {
    const data = await sqs.sendMessage(params).promise();
    console.log('Success adding image to queue', data.MessageId);
  } catch (err) {
    console.log('Error adding image to queue', err);
  }

  return;
};
