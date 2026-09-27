import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import * as backup from 'aws-cdk-lib/aws-backup'
import { Construct } from 'constructs'

export const DR_REGION = 'us-west-2'
export const DR_BACKUP_VAULT_NAME = 'dpnr-dr'

/**
 * Slice 6 (#2 backup hardening): the disaster-recovery copy target, in a
 * second region. Holds only the vault; Dpnr-Data's daily backup plan copies
 * into it. Deploy this stack before Dpnr-Data (the copy action needs the
 * vault to exist). RETAIN: the copies must survive any stack teardown.
 */
export class BackupDrStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)
    new backup.BackupVault(this, 'DrBackupVault', {
      backupVaultName: DR_BACKUP_VAULT_NAME,
      removalPolicy: RemovalPolicy.RETAIN,
    })
  }
}
