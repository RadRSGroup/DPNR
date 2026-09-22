import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { PostConfirmationTriggerEvent } from 'aws-lambda'
import { handler } from './post-confirmation'

/**
 * Security review 2026-09-14 (DPNR-12) — this trigger is the only thing
 * that ever creates a PROFILE item; every consent/erasure/credits handler
 * above assumes one exists. Its idempotency guard (never double-grant the
 * starter trial on a Cognito retry) is the specific behavior worth
 * pinning down here, not just "does it write an item".
 */

const ddbMock = mockClient(DynamoDBDocumentClient)

function confirmEvent(userId: string, triggerSource = 'PostConfirmation_ConfirmSignUp'): PostConfirmationTriggerEvent {
  return {
    triggerSource,
    request: { userAttributes: { sub: userId } },
    response: {},
  } as unknown as PostConfirmationTriggerEvent
}

beforeEach(() => {
  ddbMock.reset()
})

describe('Cognito post-confirmation trigger', () => {
  it('creates a PROFILE item with consent unset and grants the starter trial balance', async () => {
    ddbMock.on(PutCommand).resolves({})
    ddbMock.on(UpdateCommand).resolves({ Attributes: { balance: 50 } })

    await handler(confirmEvent('user-1'))

    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input
    expect(put.Item).toMatchObject({ pk: 'USER#user-1', sk: 'PROFILE', consentedAt: null, consentVersion: null })
    expect(put.ConditionExpression).toBe('attribute_not_exists(pk)')

    const grantUpdate = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(grantUpdate.ExpressionAttributeValues).toMatchObject({ ':amount': 50 })
  })

  it('does not double-grant the starter trial on a Cognito retry of an already-created profile', async () => {
    const conditionalFailure = new Error('The conditional request failed')
    conditionalFailure.name = 'ConditionalCheckFailedException'
    ddbMock.on(PutCommand).rejects(conditionalFailure)

    await handler(confirmEvent('user-1'))

    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })

  it('is a no-op for any trigger source other than PostConfirmation_ConfirmSignUp', async () => {
    await handler(confirmEvent('user-1', 'PostConfirmation_ConfirmForgotPassword'))

    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })

  it('propagates an unexpected DynamoDB error from the profile write instead of silently swallowing it', async () => {
    ddbMock.on(PutCommand).rejects(new Error('ProvisionedThroughputExceededException'))

    await expect(handler(confirmEvent('user-1'))).rejects.toThrow('ProvisionedThroughputExceededException')
  })
})
