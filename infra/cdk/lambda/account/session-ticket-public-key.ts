import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { KMSClient, GetPublicKeyCommand } from '@aws-sdk/client-kms'
import type { SessionTicketPublicKeyResponse } from '@dpnr/shared-types'
import { jsonResponse, errorResponse } from '../lib/http'

const kms = new KMSClient({})
const KEY_ID = process.env.SESSION_TICKET_KMS_KEY_ID as string

/**
 * GET /v1/session-ticket/public-key — unauthenticated (public keys aren't
 * secret, same posture as GET /v1/health). Lets the client wrap a DEK for
 * POST /v1/session-ticket entirely client-side, per ADR 0013.
 */
export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    const result = await kms.send(new GetPublicKeyCommand({ KeyId: KEY_ID }))
    if (!result.PublicKey) {
      throw new Error('KMS GetPublicKey returned no PublicKey bytes.')
    }
    const response: SessionTicketPublicKeyResponse = {
      publicKeyDer: Buffer.from(result.PublicKey).toString('base64'),
      keyId: KEY_ID,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
