import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { type GuidanceCardItem, type PullCardResponse } from '@dpnr/shared-types'
import { jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string

/**
 * POST /v1/companion/pull-card — Companion's "Pull a Card," a genuinely
 * different mechanic from the scheduled once-daily Daily Card
 * (compose-daily-card.ts): an on-demand pull from a stored, reusable card
 * library. Scoped to Companion only per the user's own direct confirmation
 * — Dashboard/Decision Room/Mirror Room's Daily Card widget is untouched.
 *
 * Same public-catalog Scan profile as `credits/get-plans.ts` (authored
 * content, not personal data, no per-user ownership despite sitting behind
 * the Cognito authorizer at the route level). v1 is a plain random pick
 * from every active card, no repeat-avoidance — the library starts with a
 * handful of cards, so tracking "recently shown" per user isn't worth the
 * extra state yet; revisit once the library is bigger.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async () => {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'sk = :cfg AND active = :true',
        ExpressionAttributeValues: { ':cfg': 'CONFIG', ':true': true },
      })
    )
    const cards = (result.Items ?? []) as GuidanceCardItem[]
    if (cards.length === 0) {
      throw new HttpError(503, 'no_cards_available', 'The card library is empty.')
    }

    const card = cards[Math.floor(Math.random() * cards.length)]
    const body: PullCardResponse = {
      cardId: card.pk.replace('GUIDANCE_CARD#', ''),
      text: card.text,
      imageRef: card.imageRef,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
