# Agent: Deployment Engineer

## Terraform
Base resources in `infrastructure/terraform/main.tf` per PRD (Aurora PostgreSQL, S3 bucket, Cognito).

## Deploy Steps
1. `npm run build`
2. Deploy to Vercel
3. Set environment variables
4. Run Prisma migrations
5. Test endpoints

## AWS Configuration Gate
- Request AWS configuration explicitly before applying Terraform or runtime config. See `docs/security/aws-config.md`.
- Store sensitive values in AWS SSM/Secrets Manager; do not commit any secrets.
