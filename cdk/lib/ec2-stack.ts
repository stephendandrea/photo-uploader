import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  SubnetType,
  UserData,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';

export class Ec2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Create a VPC
    const vpc = new Vpc(this, 'MyVpc', {
      maxAzs: 2, // Default is all AZs in region
    });

    // Create a security group
    const securityGroup = new cdk.aws_ec2.SecurityGroup(
      this,
      'InstanceSecurityGroup',
      {
        vpc,
        allowAllOutbound: true,
        description: 'Allow HTTP and SSH access to the EC2 instance',
      }
    );

    // Allow HTTP access
    securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(80),
      'Allow HTTP access'
    );
    // Allow HTTPS access (optional)
    securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(443),
      'Allow HTTPS access'
    );
    // Allow SSH access
    securityGroup.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(22),
      'Allow SSH access'
    );

    const userData = UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'amazon-linux-extras install docker',
      'service docker start',
      'usermod -a -G docker ec2-user',
      // Pull your Docker image from a registry (e.g., Docker Hub)
      'docker run -d -p 80:3000 sdandrea687/my-nextjs-app' // Replace with your actual image namec
    );

    const instance = new Instance(this, 'MyEc2Instance', {
      vpc,
      machineImage: MachineImage.latestAmazonLinux2023(),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      associatePublicIpAddress: true,
      userData,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    // Output the public IP
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
      description: 'Public IP of the Next.js EC2 instance',
    });
  }
}
