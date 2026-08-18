import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda'

// Structural, not `import type { ZodType } from 'zod'` — Zod 4's ZodType
// generic signature carries internal type params that make a simple
// `ZodType<T>` parameter type break across minor versions. Every Zod
// schema satisfies this shape regardless of version.
export interface ParsableSchema<T> {
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } }
}

/** Validates an already-parsed value (e.g. a room command's `input` record) against a schema. */
export function parseValue<T>(raw: unknown, schema: ParsableSchema<T>): T {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_request', parsed.error.issues.map((i) => i.message).join('; '))
  }
  return parsed.data
}

/**
 * Small, shared conventions for `/v1` handlers — established here since
 * this is the first pair of real (non-auth-trigger) Lambda handlers in the
 * repo and nothing existed before. Keep this file plain functions, not a
 * framework: there's no routing/middleware complexity yet that would
 * justify one.
 *
 * Error response shape (new convention): `{ error: { code, message } }`.
 * `code` is a short machine-readable slug a client can branch on;
 * `message` is human-readable and must never include raw user content —
 * only schema/validation-shaped text (guardrail: no raw payloads in
 * logs/errors, AGENT_LOG.md).
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function errorResponse(err: unknown): APIGatewayProxyStructuredResultV2 {
  if (err instanceof HttpError) {
    return jsonResponse(err.statusCode, { error: { code: err.code, message: err.message } })
  }
  // Deliberately log only the error's own message, never the request body —
  // an unexpected exception could otherwise end up wrapping user content
  // (e.g. a JSON.parse failure embedding the offending string).
  console.error('Unhandled Lambda error:', err instanceof Error ? err.message : 'unknown error')
  return jsonResponse(500, { error: { code: 'internal_error', message: 'Something went wrong.' } })
}

/**
 * Every route this project attaches the Cognito authorizer to relies on
 * this — the HTTP API's built-in JWT authorizer validates signature/
 * issuer/audience/expiry, but `sub` is what handlers actually key
 * DynamoDB partitions on (MVP_ARCHITECTURE.md §3, ADR 0004's "per-handler
 * check completes the story" principle).
 */
export function requireUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new HttpError(401, 'unauthenticated', 'Missing or invalid authorizer claims.')
  }
  return sub
}

export function parseBody<T>(event: APIGatewayProxyEventV2WithJWTAuthorizer, schema: ParsableSchema<T>): T {
  let raw: unknown
  try {
    const text = event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body
      : '{}'
    raw = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body is not valid JSON.')
  }
  return parseValue(raw, schema)
}
