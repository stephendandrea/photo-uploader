import { SQS } from 'aws-sdk';

exports.handler = async (event: any) => {
  const sqs = new SQS({ region: 'us-east-1' });

  const params = {
    DelaySeconds: 2,
    MessageBody: JSON.stringify(event.Records[0].s3),
    QueueUrl: process.env.QUEUE_URL!,
  };

  try {
    console.log('Attempting to add image to queue', event.Records[0].s3);
    const data = await sqs.sendMessage(params).promise();
    console.log(`Success adding image to queue. Message id: ${data.MessageId}`);
  } catch (err) {
    console.log('Error adding image to queue', err);
  }

  return;
};
