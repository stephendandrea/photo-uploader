import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CfnOutput,
  SecretValue,
  Stack,
  StackProps,
  aws_ssm,
} from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import {
  App,
  GitHubSourceCodeProvider,
  Platform,
  RedirectStatus,
} from '@aws-cdk/aws-amplify-alpha';
import { SecretsManager, SSM } from 'aws-sdk';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { run } from 'node:test';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

interface HostingStackProps extends cdk.StackProps {
  readonly owner: string;
  readonly repository: string;
  readonly githubOauthTokenName: string;
  readonly environmentVariables?: { [name: string]: string };
  readonly stage: string;
}

export class AmplifyHostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    const dbSecret = Secret.fromSecretNameV2(
      this,
      'db-secret',
      `${props?.stage}-credentials`
    );

    const DATABASE_URL = `postgresql://postgres:${dbSecret
      .secretValueFromJson('password')
      .unsafeUnwrap()
      .toString()}@dev.chss2suwmho3.us-east-1.rds.amazonaws.com:5432/postgres`;

    const amplifyApp = new App(this, 'AmplifyCDK', {
      appName: 'Photo Uploader',
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: props.owner,
        repository: props.repository,
        oauthToken: SecretValue.secretsManager(props.githubOauthTokenName),
      }),
      platform: Platform.WEB_COMPUTE,
      autoBranchDeletion: true,
      environmentVariables: {
        ...props.environmentVariables,
        AMPLIFY_MONOREPO_APP_ROOT: 'nextjs',
      },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: 'nextjs',
            frontend: {
              phases: {
                preBuild: {
                  commands: ['yarn install --frozen-lockfile'],
                },
                build: {
                  commands: [
                    `echo "DATABASE_URL=${DATABASE_URL}" > .env`,
                    'yarn build',
                    `cd .next; echo "DATABASE_URL=${DATABASE_URL}" > .env`,
                  ],
                },
              },
              artifacts: {
                baseDirectory: '.next',
                files: ['**/*'],
              },
              cache: {
                paths: ['node_modules/**/*'],
              },
            },
          },
        ],
      }),

      customRules: [
        {
          source: '/<*>',
          target: ' /index.html',
          status: RedirectStatus.NOT_FOUND_REWRITE,
        },
      ],
    });

    amplifyApp.addBranch('main', {
      stage: 'PRODUCTION',
    });

    // new CfnOutput(this, 'appId', {
    //   value: amplifyApp.appId,
    // });
  }
}
