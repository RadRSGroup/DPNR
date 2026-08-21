import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// removeUndefinedValues: same real gotcha rooms/db.ts documents — an object
// literal that conditionally omits a key is fine, but any call site that
// ever assigns a key to `undefined` directly (rather than omitting it via
// spread) would otherwise throw on marshal. Cheap to set defensively here.
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})
export const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
