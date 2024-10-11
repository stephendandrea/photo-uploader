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
import { SecretsManager } from 'aws-sdk';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { run } from 'node:test';

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
        ...(props.environmentVariables || {}),
      },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: 'nextjs',
            backend: {
              enviornment: {},
            },
            frontend: {
              phases: {
                preBuild: {
                  commands: ['npm ci'],
                },
                build: {
                  commands: ['npm run build'],
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
        framework: {
          name: 'next',
          version: '14.2.15',
        },
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

    new CfnOutput(this, 'appId', {
      value: amplifyApp.appId,
    });
  }
}
