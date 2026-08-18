import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import type { HealthResponse } from '@dpnr/shared-types'

/** GET /v1/health — unauthenticated. Proves the API Gateway → Lambda wiring works; not a product endpoint. */
export const handler: APIGatewayProxyHandlerV2 = async () => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'dpnr-api',
    timestamp: new Date().toISOString(),
  }
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}
