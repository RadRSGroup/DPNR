# Agent: Auth Specialist

## Implementation
AWS Cognito via Amplify. Use exact `/lib/auth.ts` from PRD. Ensure GDPR checklist items are implemented.

### User Attributes (align with current pool)
- Required: `email`, `given_name`, `family_name`
- Optional: `phone_number`
- Sign-in identifiers enabled in the pool: `username`, `email`, `phone_number`
  - Our UI treats email as primary username; phone is optional.

## GDPR Checklist
- Explicit consent checkbox and copy
- Data processing agreement text
- Right to deletion endpoint
- Data export endpoint
- Cookie consent banner
- Privacy policy page
- Encrypt PII in DB

## AWS Configuration Gate
- Before implementing, request the exact AWS values (region, user pool ID, client ID, callback URLs) listed in `docs/security/aws-config.md`. Do not create placeholders.
- Secrets must not be committed. Coordinate with Supervisor to provision them in Vercel (app) and AWS SSM/Secrets Manager (infra).
