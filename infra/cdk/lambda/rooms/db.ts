import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// Shared across every Rooms step file (Decision and Mirror alike) — all
// run inside the same RoomsCommandFn Lambda process, so one client, not
// one per imported module.
//
// removeUndefinedValues is required, not cosmetic: command.ts's own
// response object always includes a `promptRef` key (RoomCommandResponse's
// `promptRef` is optional, but the object literal that builds it sets the
// key regardless), which is `undefined` for every SUBMIT_STEP/SKIP action
// (only REFINE handlers set it) — that object gets persisted verbatim as
// SessionItem.lastResponse on every single command. Without this option
// the AWS SDK v3 document client throws "Pass options.removeUndefinedValues
// =true..." on marshal, which a mocked-DynamoDB integration test never
// catches (a plain JS Map has no such restriction) — only surfaced against
// the real table, during this session's live browser verification of the
// Decision Room UI port.
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})
export const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
export const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string
