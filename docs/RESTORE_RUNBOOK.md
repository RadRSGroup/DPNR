# DPNR — Restore Runbook

One page for "something is gone or broken, get it back". Account `346866989957`, primary region `us-east-1`, DR region `us-west-2`. Every command is PowerShell-safe. **Restore into a NEW table first, check it, then decide** — never restore over a live table.

## What protects what (Slice 6, Session 75)

| Data | Protection | How far back |
|---|---|---|
| `dpnr-application` (all user data), `dpnr-prompt-registry`, `dpnr-library-catalog`, `dpnr-plans-catalog` | PITR (continuous) + AWS Backup daily 03:00 UTC (`dpnr-daily` plan → vault `dpnr-primary`) + a copy of each daily backup in `us-west-2` (vault `dpnr-dr`) + deletion protection + RETAIN | PITR: any second in the last 35 days. Daily backups: 35 days, both regions. |
| `dpnr-session-tickets` | **None, by design** — a revoked ticket must never come back (migration plan §6.5). After a loss, users just sign in again. | — |
| Avatars / chat backgrounds bucket (`dpnr-avatars-346866989957-us-east-1`) | Versioning (old/deleted versions kept 30 days) + AWS Backup daily (+ DR copy) + RETAIN, no auto-delete | 30 days of versions; 35 days of backups |
| Cognito user pool `dpnr-users` | Deletion protection + RETAIN. **No backup/restore exists for Cognito.** | — |
| Prompt Registry *content* | Also in git: `infra/cdk/scripts/*.seed.ts` (`npm run seed:prompt-registry` rebuilds it) | every commit |
| Frontend (Render, `dpnr-mvp.onrender.com`) | Render keeps every deploy | all past deploys |

Privacy note: an erased account's data can remain in PITR/backups for up to 35 days (photos: 30 days of versions + 35 days of backups). This is a disclosure item for the privacy review (DPNR-02), not a bug.

## 1. A table's data was damaged (bad write, bad script) — PITR

```powershell
# Restore to the minute before the damage, into a new table
aws dynamodb restore-table-to-point-in-time --region us-east-1 `
  --source-table-name dpnr-application `
  --target-table-name dpnr-application-restore-YYYYMMDD `
  --restore-date-time 2026-09-27T21:59:00Z
aws dynamodb wait table-exists --region us-east-1 --table-name dpnr-application-restore-YYYYMMDD
aws dynamodb describe-table --region us-east-1 --table-name dpnr-application-restore-YYYYMMDD --query "Table.[TableStatus,ItemCount]"
```

Then either copy the affected items back (a small scripted `get-item`/`put-item` for the damaged keys — preferred), or, for total loss, point the stacks at the restored table (a code change: table names are fixed in `lib/data-stack.ts`). The restored table has no PITR/TTL/deletion protection — turn them on if it becomes the live table. Delete the restore table when done.

## 2. A table was deleted, or the region is unusable — AWS Backup

```powershell
# Latest recovery points (use --region us-west-2 --backup-vault-name dpnr-dr for the DR copy)
aws backup list-recovery-points-by-backup-vault --region us-east-1 --backup-vault-name dpnr-primary `
  --query "RecoveryPoints[?ResourceType=='DynamoDB'].[RecoveryPointArn,ResourceArn,CreationDate]" --output table
aws backup get-recovery-point-restore-metadata --region us-east-1 --backup-vault-name dpnr-primary --recovery-point-arn <ARN>
aws backup start-restore-job --region us-east-1 --recovery-point-arn <ARN> `
  --iam-role-arn <Dpnr-Data BackupRole ARN> `
  --metadata TargetTableName=dpnr-application-restore-YYYYMMDD
aws backup describe-restore-job --region us-east-1 --restore-job-id <ID>
```

Encrypted content in the table is still readable after a restore: it's wrapped by the user's own keys, not by the table. A full-region loss needs more than data (Lambdas, API, Cognito exist only in `us-east-1`) — that's a rebuild, not a restore; out of scope for MVP.

## 3. Photos — S3 versioning (quickest) or AWS Backup

```powershell
aws s3api list-object-versions --bucket dpnr-avatars-346866989957-us-east-1 --prefix avatars/<sub>/
# A deleted object: remove its delete marker to bring the previous version back
aws s3api delete-object --bucket dpnr-avatars-346866989957-us-east-1 --key <key> --version-id <deleteMarkerVersionId>
```

Whole-bucket loss: restore the latest S3 recovery point from `dpnr-primary` (section 2, `ResourceType=='S3'`) into a new bucket.

## 4. Prompts went bad

Re-seed from a known-good commit: `git checkout <good-commit> -- infra/cdk/scripts; cd infra/cdk; npm run seed:prompt-registry; git checkout HEAD -- scripts`. (Session 74 did exactly this.) Remember prompts and Lambdas must match — check the template variables.

## 5. A bad frontend deploy — Render rollback

Render dashboard → service `dpnr-mvp` → **Events** → pick the last good deploy → **Rollback**. That's instant and doesn't touch git; the next push to `mvp` redeploys whatever `mvp` has, so also fix or revert the commit: `git revert <bad-commit>; git push origin mvp`.

## 6. A bad backend deploy

Re-deploy the last good commit: `git checkout <good-commit>`, then the usual deploy (with the `bundling-temp` cleanup) and `git checkout mvp` afterwards. Verify against AWS (stack `LastUpdatedTime`, a marker in the live bundle), never on the terminal's word alone. Lambda code has no data in it, so this is safe; a resource *removal* in the diff is not — read the `cdk diff` first.

## Drills

Do one restore drill after any change to this setup, and at least quarterly: restore `dpnr-prompt-registry` (small, no personal data) via section 1 into `dpnr-restore-drill-YYYYMMDD`, compare `ItemCount` to the live table, delete the drill table. Log the result in `docs/AGENT_LOG.md`.

| Date | Drill | Result |
|---|---|---|
| — | none yet | — |
