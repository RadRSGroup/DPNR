# AWS Configuration Prompts

> Before implementing AWS-dependent features, request these exact values. Do not invent placeholders.

## Cognito (Auth Specialist)
- AWS Region (e.g., `eu-west-1`): ______
- User Pool ID: ______
- User Pool Client ID: ______
- Callback URLs (for Amplify): ______
- Allowed OAuth flows/scopes (if applicable): ______

## S3 (Materials)
- AWS Region: ______
- Bucket Name: ______
- IAM principal for app (access key or role): ______
- Permissions: getObject (presign), putObject (if needed), list (if needed)
- Key prefix convention (e.g., `materials/{courseId}/...`): ______

## Database (Aurora/Postgres) — if not using local Postgres
- Cluster identifier: ______
- Database name: ______
- Username: ______
- Password: ______
- Host/Port: ______
- Connectivity method (private/public): ______

## Secrets Management
- Chosen secret store (SSM/Secrets Manager): ______
- Path/naming convention for parameters/secrets: ______

