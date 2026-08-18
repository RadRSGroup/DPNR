import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

// Shared across every Decision Room step file — all run inside the same
// RoomsCommandFn Lambda process, so one client, not one per imported module.
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
export const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
export const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string
