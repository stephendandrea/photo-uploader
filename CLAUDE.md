# CLAUDE.md - AI Assistant Guide for Photo Uploader

This document provides comprehensive guidance for AI assistants working with the photo-uploader codebase.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Technology Stack](#technology-stack)
5. [Development Workflows](#development-workflows)
6. [Key Conventions](#key-conventions)
7. [Common Tasks](#common-tasks)
8. [Testing Guidelines](#testing-guidelines)
9. [Deployment](#deployment)
10. [Important Notes & Gotchas](#important-notes--gotchas)

---

## Project Overview

**Photo Uploader** is a full-stack serverless application that enables users to upload photos to AWS S3 and automatically process them (currently converts to grayscale). The application demonstrates modern cloud-native architecture with:

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: AWS Lambda functions for serverless compute
- **Storage**: AWS S3 for object storage
- **Database**: AWS RDS PostgreSQL 16.4 with Prisma ORM
- **Queue**: AWS SQS for async processing
- **Infrastructure**: AWS CDK for Infrastructure as Code

**Core Workflow**:
1. User uploads file via Next.js frontend
2. Frontend requests presigned URL from Lambda
3. File uploads directly to S3 (client → S3, bypassing backend)
4. S3 event triggers Lambda to add message to SQS queue
5. Queue triggers processor Lambda to download, process, and save image

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         │ 1. Request presigned URL
         ▼
┌─────────────────────────┐
│ API Gateway + Lambda    │
│ (create-upload-url)     │
└────────┬────────────────┘
         │ 2. Return presigned URL
         ▼
┌─────────────────┐      3. Direct Upload
│    AWS S3       │◄─────────────────────
│   (Bucket)      │
└────────┬────────┘
         │ 4. S3 Event (OBJECT_CREATED_POST)
         ▼
┌─────────────────────────┐
│     Lambda              │
│ (add-image-to-queue)    │
└────────┬────────────────┘
         │ 5. Send message
         ▼
┌─────────────────┐
│    AWS SQS      │
│    (Queue)      │
└────────┬────────┘
         │ 6. Trigger
         ▼
┌─────────────────────────┐
│     Lambda              │
│  (process-image)        │
│  - Download from S3     │
│  - Convert to grayscale │
│  - Save as bw-*.jpg     │
└─────────────────────────┘

┌─────────────────┐
│   RDS/Postgres  │◄─── Prisma ORM
│   (Database)    │
└─────────────────┘
```

### Component Responsibilities

| Component | Purpose | Triggers | Outputs |
|-----------|---------|----------|---------|
| **create-upload-url** | Generate S3 presigned POST URL | API Gateway GET | JSON with presigned URL |
| **add-image-to-queue** | Bridge S3 events to queue | S3 OBJECT_CREATED_POST | SQS message |
| **process-image** | Async image processing | SQS messages | Processed image in S3 |
| **Uploader Component** | File upload UI | User interaction | S3 upload |
| **Users Page** | Display users from DB | Page request | SSR HTML |

---

## Directory Structure

```
photo-uploader/
├── .github/
│   └── workflows/
│       └── main.yml                 # GitHub Actions CI/CD (minimal)
│
├── cdk/                             # AWS CDK Infrastructure as Code
│   ├── bin/
│   │   └── my-cdk-project.ts       # CDK app entry point
│   ├── lib/
│   │   ├── my-cdk-project-stack.ts # Main compute stack (S3, Lambda, SQS)
│   │   ├── database-stack.ts       # RDS PostgreSQL setup
│   │   ├── ec2-stack.ts           # EC2 Docker hosting
│   │   └── amplify-hosting-stack.ts # AWS Amplify (disabled)
│   ├── lambda/
│   │   ├── create-upload-url.ts   # Lambda: Presigned URL generator
│   │   ├── add-image-to-queue.ts  # Lambda: S3 → SQS
│   │   └── process-image.ts       # Lambda: Image processor
│   ├── test/
│   │   └── my-cdk-project.test.ts # Jest tests (mostly commented)
│   ├── package.json
│   ├── tsconfig.json
│   ├── cdk.json                   # CDK configuration
│   └── jest.config.js
│
└── nextjs/                         # Next.js Frontend Application
    ├── app/                        # App Router (Next.js 14+)
    │   ├── page.tsx               # Home page
    │   ├── layout.tsx             # Root layout
    │   ├── globals.css            # Global styles
    │   └── components/
    │       └── uploader.tsx       # File upload component
    ├── pages/                      # Pages Router (legacy support)
    │   └── users.tsx              # Users page with DB query
    ├── lib/
    │   └── primsa.ts              # Prisma client singleton (typo in filename)
    ├── prisma/
    │   ├── schema.prisma          # Database schema
    │   └── migrations/            # Prisma migrations
    ├── public/                     # Static assets
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.mjs
    ├── .amplify.yml               # Amplify build config
    └── .env                       # Environment variables (RDS credentials)
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14.2.7 (App Router + Pages Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1
- **Database ORM**: Prisma 5.20.0 with Neon adapter
- **React**: 18.x

### Backend/Infrastructure
- **IaC**: AWS CDK 2.160.0 (TypeScript)
- **Runtime**: Node.js 20.x on Lambda
- **Storage**: AWS S3
- **Queue**: AWS SQS
- **Database**: AWS RDS PostgreSQL 16.4
- **API**: AWS API Gateway (REST)
- **Compute**: AWS Lambda + EC2 (Docker)

### Image Processing
- **Jimp**: 1.6.0 (image manipulation)
- **Sharp**: 0.33.5 (high-performance processing)
- **heic-convert**: 2.1.0 (HEIC format support)

### Development Tools
- **Testing**: Jest 29.7.0 with ts-jest
- **Linting**: ESLint with Next.js config
- **Package Manager**: npm

---

## Development Workflows

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd photo-uploader

# Setup Next.js
cd nextjs
npm install
cp .env.example .env  # Configure DATABASE_URL
npx prisma generate   # Generate Prisma client
npx prisma migrate dev # Run migrations

# Setup CDK (in separate terminal)
cd ../cdk
npm install
npm run build
```

### Development Commands

#### Next.js (Frontend)
```bash
cd nextjs

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Database operations
npx prisma studio        # Open Prisma Studio GUI
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Regenerate Prisma client
```

#### CDK (Infrastructure)
```bash
cd cdk

# Compile TypeScript
npm run build

# Watch mode (auto-compile on changes)
npm run watch

# Run tests
npm run test

# Deploy all stacks
npx cdk deploy --all

# Deploy specific stack
npx cdk deploy DatabaseStack

# Show diff from deployed state
npx cdk diff

# Generate CloudFormation template
npx cdk synth

# Destroy infrastructure
npx cdk destroy --all
```

### Git Workflow

**Branch Naming Convention**: `claude/claude-md-<session-id>`

**Standard Git Flow**:
```bash
# Always work on designated branch
git checkout -b claude/claude-md-<session-id>

# Stage changes
git add .

# Commit with descriptive message
git commit -m "Brief description of changes"

# Push to remote (use -u for first push)
git push -u origin claude/claude-md-<session-id>
```

**Important**:
- All development must be on branches starting with `claude/`
- Branch must end with matching session ID
- Push will fail with 403 if branch naming is incorrect
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) for network errors

---

## Key Conventions

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Lambda functions | kebab-case | `create-upload-url.ts` |
| CDK Stacks | PascalCase + "Stack" suffix | `MyCdkProjectStack` |
| React Components | PascalCase | `Uploader` |
| Environment Variables | UPPER_SNAKE_CASE | `BUCKET_NAME`, `QUEUE_URL` |
| TypeScript files | kebab-case or camelCase | `my-cdk-project.ts`, `primsa.ts` |

### Code Patterns

#### Prisma Client Singleton
Location: `nextjs/lib/primsa.ts` (note: typo in filename)

```typescript
// Development: Store client in global to prevent multiple instances
// Production: Create new client per request
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: neonAdapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### Lambda CORS Response Pattern
All Lambda functions return CORS-enabled responses:

```typescript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify({ /* data */ }),
}
```

#### S3 Client Pattern
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });
```

#### Environment Variable Access in Lambda
```typescript
const bucketName = process.env.BUCKET_NAME;
const queueUrl = process.env.QUEUE_URL;
```

### TypeScript Configuration

**CDK** (`cdk/tsconfig.json`):
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Experimental decorators enabled

**Next.js** (`nextjs/tsconfig.json`):
- Module: ESNext
- ModuleResolution: Bundler
- Path alias: `@/*` maps to `./*`
- Incremental compilation enabled

### Feature Tracking Comments

The codebase uses inline comments to track features:
- `// Feature 1` in `lib/primsa.ts`
- `// Feature 2` in `pages/users.tsx`
- `// Feature 3` in `app/layout.tsx`
- `// ADD DROPDOWN`, `// CREATE MODAL` for planned features

**When working on features**, maintain this pattern:
```typescript
// Feature 4: Add user authentication
export function authenticateUser() { /* ... */ }
```

---

## Common Tasks

### Adding a New Lambda Function

1. **Create Lambda file**: `cdk/lambda/my-new-function.ts`
2. **Define handler**:
   ```typescript
   import { S3Event, SQSEvent, APIGatewayProxyEvent } from 'aws-lambda';

   export const handler = async (event: S3Event | SQSEvent) => {
     try {
       // Your logic here
       return {
         statusCode: 200,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type',
         },
         body: JSON.stringify({ success: true }),
       };
     } catch (error) {
       console.error('Error:', error);
       throw error;
     }
   };
   ```

3. **Add to CDK Stack** (`cdk/lib/my-cdk-project-stack.ts`):
   ```typescript
   const myNewFunction = new lambda.Function(this, 'MyNewFunction', {
     runtime: lambda.Runtime.NODEJS_20_X,
     code: lambda.Code.fromAsset('lambda'),
     handler: 'my-new-function.handler',
     environment: {
       MY_VAR: 'value',
     },
   });
   ```

4. **Deploy**: `npx cdk deploy`

### Adding a New Database Model

1. **Edit schema** (`nextjs/prisma/schema.prisma`):
   ```prisma
   model Photo {
     id        Int      @id @default(autoincrement())
     url       String
     userId    Int
     user      User     @relation(fields: [userId], references: [id])
     createdAt DateTime @default(now())
   }

   model User {
     id      Int      @id @default(autoincrement())
     email   String   @unique
     name    String?
     photos  Photo[]
   }
   ```

2. **Create migration**:
   ```bash
   cd nextjs
   npx prisma migrate dev --name add_photos
   ```

3. **Generate client**:
   ```bash
   npx prisma generate
   ```

4. **Use in code**:
   ```typescript
   import { prisma } from '@/lib/primsa';

   const photos = await prisma.photo.findMany({
     where: { userId: 1 },
     include: { user: true },
   });
   ```

### Adding a New Next.js Page

**App Router** (preferred):
```bash
# Create new route
mkdir -p nextjs/app/photos
touch nextjs/app/photos/page.tsx

# Edit page.tsx
```

```typescript
export default function PhotosPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Photos</h1>
      {/* Your content */}
    </div>
  );
}
```

**Pages Router** (legacy):
```bash
touch nextjs/pages/photos.tsx
```

```typescript
import { GetStaticProps } from 'next';
import { prisma } from '@/lib/primsa';

export default function PhotosPage({ photos }) {
  return (
    <div>
      {photos.map(photo => (
        <img key={photo.id} src={photo.url} alt="Photo" />
      ))}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const photos = await prisma.photo.findMany();
  return { props: { photos } };
};
```

### Updating API Endpoint

**Current hardcoded endpoint**: `https://lmv62409e5.execute-api.us-east-1.amazonaws.com/prod/create-upload-url`

**To make dynamic**:
1. Add to environment variables in `nextjs/.env`:
   ```
   NEXT_PUBLIC_API_ENDPOINT=https://lmv62409e5.execute-api.us-east-1.amazonaws.com/prod
   ```

2. Update `nextjs/app/components/uploader.tsx`:
   ```typescript
   const apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT;
   const response = await fetch(`${apiEndpoint}/create-upload-url?key=${fileName}`);
   ```

3. For CDK deployment, output API URL:
   ```typescript
   new cdk.CfnOutput(this, 'ApiEndpoint', {
     value: api.url,
     description: 'API Gateway endpoint URL',
   });
   ```

### Adding Image Processing Logic

Edit `cdk/lambda/process-image.ts`:

```typescript
import Jimp from 'jimp';

// Current: Grayscale conversion
const image = await Jimp.read(buffer);
await image.greyscale().writeAsync(`/tmp/${processedKey}`);

// Add: Resize
await image.resize(800, Jimp.AUTO);

// Add: Watermark
const watermark = await Jimp.read('watermark.png');
image.composite(watermark, 10, 10);

// Add: Format conversion
await image.quality(90).writeAsync(`/tmp/${processedKey}`);
```

---

## Testing Guidelines

### Current State
- **CDK Tests**: Located in `cdk/test/`, mostly commented out
- **Frontend Tests**: No test configuration exists
- **Integration Tests**: None implemented

### Setting Up Frontend Tests (Recommended)

1. **Install dependencies**:
   ```bash
   cd nextjs
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
   ```

2. **Create `jest.config.js`**:
   ```javascript
   const nextJest = require('next/jest')

   const createJestConfig = nextJest({
     dir: './',
   })

   const customJestConfig = {
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     testEnvironment: 'jest-environment-jsdom',
   }

   module.exports = createJestConfig(customJestConfig)
   ```

3. **Create `jest.setup.js`**:
   ```javascript
   import '@testing-library/jest-dom'
   ```

4. **Write tests** (`__tests__/uploader.test.tsx`):
   ```typescript
   import { render, screen } from '@testing-library/react';
   import Uploader from '@/app/components/uploader';

   describe('Uploader', () => {
     it('renders upload button', () => {
       render(<Uploader />);
       expect(screen.getByText(/upload/i)).toBeInTheDocument();
     });
   });
   ```

### Running CDK Tests

```bash
cd cdk
npm run test
```

**Test patterns**:
```typescript
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as MyStack from '../lib/my-cdk-project-stack';

test('S3 Bucket Created', () => {
  const app = new cdk.App();
  const stack = new MyStack.MyCdkProjectStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    CorsConfiguration: {
      CorsRules: [
        {
          AllowedMethods: ['GET', 'POST'],
          AllowedOrigins: ['*'],
        },
      ],
    },
  });
});
```

---

## Deployment

### Prerequisites
- AWS CLI configured with credentials
- AWS CDK CLI installed: `npm install -g aws-cdk`
- Environment variables set: `CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`

### First-Time Deployment

```bash
# 1. Bootstrap CDK (one-time per account/region)
cd cdk
npx cdk bootstrap aws://<account-id>/us-east-1

# 2. Deploy database stack first
npx cdk deploy DatabaseStack

# 3. Update .env with RDS endpoint (from stack output)
cd ../nextjs
echo "DATABASE_URL=postgresql://user:pass@<rds-endpoint>:5432/mydb" > .env

# 4. Run Prisma migrations
npx prisma migrate deploy

# 5. Deploy application stack
cd ../cdk
npx cdk deploy MyCdkProjectStack

# 6. Deploy EC2 hosting (optional)
npx cdk deploy Ec2Stack

# 7. Note API Gateway endpoint from output
# Update nextjs/app/components/uploader.tsx with new endpoint
```

### Subsequent Deployments

```bash
cd cdk

# Deploy all stacks
npx cdk deploy --all

# Deploy specific stack
npx cdk deploy MyCdkProjectStack

# Deploy with auto-approval (CI/CD)
npx cdk deploy --all --require-approval never
```

### Rollback

```bash
# CDK doesn't support direct rollback
# Option 1: Redeploy previous version from git
git checkout <previous-commit>
npx cdk deploy --all

# Option 2: Use CloudFormation console
# Navigate to AWS Console → CloudFormation → Select stack → Rollback
```

### Environment-Specific Deployments

```bash
# Development
CDK_DEFAULT_ACCOUNT=123456789 CDK_DEFAULT_REGION=us-east-1 npx cdk deploy --all

# Production
CDK_DEFAULT_ACCOUNT=987654321 CDK_DEFAULT_REGION=us-west-2 npx cdk deploy --all
```

### Deployment Checklist

- [ ] Run `npm run build` in both `cdk/` and `nextjs/`
- [ ] Run `npm run test` in `cdk/`
- [ ] Run `npx cdk diff` to preview changes
- [ ] Ensure DATABASE_URL is correctly set
- [ ] Update API endpoint in frontend if changed
- [ ] Test locally before deploying
- [ ] Deploy to staging/dev environment first
- [ ] Monitor CloudWatch logs after deployment
- [ ] Test critical user flows post-deployment

---

## Important Notes & Gotchas

### Known Issues

1. **Typo in Prisma client filename**: `lib/primsa.ts` should be `lib/prisma.ts`
   - When refactoring, update all imports: `import { prisma } from '@/lib/primsa'`

2. **Hardcoded credentials in .env**:
   - `.env` contains plaintext RDS password
   - **Security risk**: Do not commit `.env` to version control
   - **Better approach**: Use AWS Secrets Manager (already configured in CDK)

3. **Hardcoded API endpoint**:
   - `uploader.tsx` has hardcoded API Gateway URL
   - **Issue**: Breaks when redeploying CDK stack
   - **Solution**: Use environment variable (see [Updating API Endpoint](#updating-api-endpoint))

4. **Commented tests**:
   - Most CDK tests in `cdk/test/my-cdk-project.test.ts` are commented out
   - **Impact**: No test coverage for infrastructure
   - **Action**: Uncomment and update tests when modifying CDK stacks

5. **Disabled Amplify hosting**:
   - `AmplifyHostingStack` is commented out in `bin/my-cdk-project.ts`
   - **Current hosting**: EC2 with Docker
   - **Action**: If re-enabling Amplify, ensure GitHub connection is configured

6. **Minimal CI/CD**:
   - GitHub Actions workflow (`.github/workflows/main.yml`) only runs `react-project-checker`
   - **Missing**: Build, test, deploy automation
   - **Action**: Enhance workflow with build/deploy steps

7. **No error monitoring**:
   - No APM or error tracking (Sentry, DataDog, etc.)
   - **Only logging**: CloudWatch Logs
   - **Action**: Add error monitoring for production

8. **Region hardcoded**:
   - Lambda functions hardcode `us-east-1` region
   - **Issue**: Not portable to other regions
   - **Solution**: Use `process.env.AWS_REGION` in Lambda

### Security Considerations

- **S3 CORS**: Currently allows all origins (`*`)
  - **Production**: Restrict to specific domains
  - Update in `cdk/lib/my-cdk-project-stack.ts`:
    ```typescript
    corsConfiguration: {
      corsRules: [{
        allowedOrigins: ['https://yourdomain.com'],
        // ...
      }],
    }
    ```

- **API Gateway**: No authentication
  - **Current**: Public endpoint, anyone can generate presigned URLs
  - **Production**: Add API key, Cognito, or Lambda authorizer

- **Lambda permissions**:
  - `process-image` has full S3 read/write access
  - **Better**: Restrict to specific bucket

- **RDS**:
  - Public accessibility depends on VPC configuration
  - **Production**: Use VPC with private subnets, no public access

### Performance Considerations

- **Lambda cold starts**:
  - Node.js 20.x runtime, typically 500ms-2s cold start
  - **Optimization**: Use provisioned concurrency for critical functions

- **Image processing**:
  - Jimp is pure JavaScript (slower than native)
  - **Alternative**: Sharp (already installed) uses native bindings
  - **Recommendation**: Switch to Sharp for large images

- **SQS batch size**: Currently 1 message per Lambda
  - **Optimization**: Increase batch size to 10 for bulk processing

- **Database connections**:
  - Prisma creates new connection per Lambda invocation
  - **Solution**: Use RDS Proxy or connection pooling (PgBouncer)

### Cost Optimization

- **NAT Gateway**: DatabaseStack uses no NAT gateways (cost savings)
- **EC2**: t3.micro instance (eligible for free tier)
- **RDS**: Single-AZ deployment recommended for dev/staging
- **S3**: Enable lifecycle policies to move old images to Glacier
- **Lambda**: Monitor usage and optimize memory/timeout settings

### Development Tips

1. **Hot reload Lambda changes**:
   - Use `npm run watch` in `cdk/` directory
   - Changes to Lambda code require `cdk deploy` (no hot reload)

2. **Test Lambda locally**:
   - Use AWS SAM CLI: `sam local invoke`
   - Or create test scripts in `cdk/lambda/test-*.ts`

3. **Debug Prisma queries**:
   - Enable query logging:
     ```typescript
     const prisma = new PrismaClient({
       log: ['query', 'info', 'warn', 'error'],
     });
     ```

4. **View CloudWatch logs**:
   ```bash
   aws logs tail /aws/lambda/create-upload-url --follow
   ```

5. **Access RDS from local**:
   - Use SSH tunnel if RDS is in private subnet:
     ```bash
     ssh -i key.pem -L 5432:<rds-endpoint>:5432 ec2-user@<ec2-ip>
     ```

6. **Clear Next.js cache**:
   ```bash
   rm -rf nextjs/.next
   npm run build
   ```

### Monitoring & Debugging

**CloudWatch Logs**:
- Lambda logs: `/aws/lambda/<function-name>`
- API Gateway logs: Enable in API Gateway stage settings

**Useful AWS CLI commands**:
```bash
# View recent Lambda invocations
aws lambda list-functions

# Get Lambda function URL
aws lambda get-function-url-config --function-name create-upload-url

# List S3 objects
aws s3 ls s3://<bucket-name>

# View SQS queue attributes
aws sqs get-queue-attributes --queue-url <url> --attribute-names All

# Tail Lambda logs
aws logs tail /aws/lambda/<function-name> --follow

# Query RDS
psql -h <rds-endpoint> -U <username> -d <database>
```

### When Things Go Wrong

**Lambda fails with timeout**:
- Check CloudWatch logs for errors
- Increase timeout in CDK: `timeout: cdk.Duration.seconds(60)`
- Increase memory (more memory = more CPU): `memorySize: 1024`

**S3 upload fails**:
- Check CORS configuration
- Verify presigned URL hasn't expired (default: 5 minutes)
- Check browser console for CORS errors

**Database connection fails**:
- Verify DATABASE_URL in `.env`
- Check RDS security group allows connections
- Ensure Prisma client is generated: `npx prisma generate`
- Check RDS instance is running (not stopped)

**CDK deployment fails**:
- Check AWS CLI credentials: `aws sts get-caller-identity`
- Verify CDK is bootstrapped: `cdk bootstrap`
- Check for resource limits (VPC quotas, Lambda concurrency)
- Review CloudFormation events in AWS Console

**Next.js build fails**:
- Clear cache: `rm -rf .next`
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all dependencies installed: `rm -rf node_modules && npm install`

---

## Quick Reference

### File Locations

| What | Where |
|------|-------|
| Lambda functions | `cdk/lambda/*.ts` |
| CDK stacks | `cdk/lib/*-stack.ts` |
| Database schema | `nextjs/prisma/schema.prisma` |
| Next.js pages (App Router) | `nextjs/app/*/page.tsx` |
| Next.js pages (Pages Router) | `nextjs/pages/*.tsx` |
| React components | `nextjs/app/components/*.tsx` |
| Environment variables | `nextjs/.env` |
| API endpoint | Hardcoded in `nextjs/app/components/uploader.tsx` |
| Prisma client | `nextjs/lib/primsa.ts` |

### Common Commands

```bash
# Development
cd nextjs && npm run dev
cd cdk && npm run watch

# Deployment
cd cdk && npx cdk deploy --all

# Database
cd nextjs && npx prisma studio
cd nextjs && npx prisma migrate dev

# Testing
cd cdk && npm run test

# Logs
aws logs tail /aws/lambda/<function-name> --follow

# AWS account info
aws sts get-caller-identity
```

### Environment Variables

**Next.js** (`.env`):
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_API_ENDPOINT`: (recommended) API Gateway URL

**Lambda** (set in CDK):
- `BUCKET_NAME`: S3 bucket name
- `QUEUE_URL`: SQS queue URL

**CDK** (shell):
- `CDK_DEFAULT_ACCOUNT`: AWS account ID
- `CDK_DEFAULT_REGION`: AWS region (us-east-1)

---

## Additional Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Prisma Documentation**: https://www.prisma.io/docs
- **AWS Lambda Best Practices**: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Last Updated**: 2025-11-17

**Maintainers**: AI assistants should keep this document updated when making significant architectural changes.
