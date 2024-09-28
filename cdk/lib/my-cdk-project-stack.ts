import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import path = require('path');
import * as sqs from 'aws-cdk-lib/aws-sqs';
export class MyCdkProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define an S3 bucket
    const bucket = new cdk.aws_s3.Bucket(this, 'MyBucket', {
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [
            cdk.aws_s3.HttpMethods.DELETE,
            cdk.aws_s3.HttpMethods.GET,
            cdk.aws_s3.HttpMethods.POST,
            cdk.aws_s3.HttpMethods.PUT,
          ],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Define a Lambda function to generate pre-signed URLs
    const createUploadUrlFunction = new NodejsFunction(
      this,
      'CreatePresignedUrlFunction',
      {
        runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(__dirname, '../lambda/create-upload-url.ts'),
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    // Grant the Lambda function read/write permissions to the S3 bucket
    bucket.grantReadWrite(createUploadUrlFunction);

    // Create an API Gateway REST API
    const api = new cdk.aws_apigateway.RestApi(this, 'presignedUrlApi', {
      restApiName: 'Presigned URL Service',
      description: 'This service generates presigned URLs for S3 objects.',
      defaultCorsPreflightOptions: {
        allowMethods: ['*'],
        allowHeaders: ['*'],
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS,
      },
    });

    // Create a Lambda integration
    const getPresignedUrlIntegration = new cdk.aws_apigateway.LambdaIntegration(
      createUploadUrlFunction
    );

    const presignedUrlResource = api.root.addResource('create-upload-url');
    presignedUrlResource.addMethod('GET', getPresignedUrlIntegration);

    //
    //
    // ADD IMAGE TO QUEUE
    //
    //

    const queue = new sqs.Queue(this, 'QueueQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const queuePolicy = new cdk.aws_iam.PolicyStatement({
      actions: ['*'],
      resources: [queue.queueArn],
    });

    const addImageToQueue = new NodejsFunction(this, 'QueueImageFunction', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/add-image-to-queue.ts'),
      environment: { QUEUE_URL: queue.queueUrl },
      initialPolicy: [queuePolicy],
    });

    const s3PutEventSource = new cdk.aws_lambda_event_sources.S3EventSource(
      bucket,
      { events: [cdk.aws_s3.EventType.OBJECT_CREATED_POST] }
    );

    addImageToQueue.addEventSource(s3PutEventSource);

    //
    //
    // PROCESS IMAGE
    //
    //

    const processImage = new NodejsFunction(this, 'ProcessImageFunction', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/process-image.ts'),
    });

    const eventSource = new cdk.aws_lambda_event_sources.SqsEventSource(queue, {
      batchSize: 1,
    });

    processImage.addEventSource(eventSource);

    bucket.grantReadWrite(processImage);
  }
}
