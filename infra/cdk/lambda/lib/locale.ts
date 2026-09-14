import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type GenderIdentity, type UserProfileItem } from '@dpnr/shared-types'

/**
 * Hebrew Localization Slice E (docs/HEBREW_LOCALIZATION_PLAN.md §4.2/§4.3) —
 * shared locale resolution for every Bedrock prompt call site.
 *
 * Resolution order, mirroring §4.2's own priority list but read the way
 * that list's own text actually describes it (not a blind claim-first
 * chain): if the caller already has the real `UserProfileItem` in hand
 * (most call sites do, via `requireConsent()` or a Scan they were already
 * doing for another reason), its `preferredLanguage` is authoritative and
 * free — use it. Only fall back to the JWT `custom:locale` claim (fast
 * path, only as fresh as the last token refresh — same staleness caveat as
 * `custom:consent`) for the few call sites with no profile read at all
 * (`companion/context.ts`'s pure-GET endpoints). `'en'` is the final
 * default when neither is available.
 */
export type Locale = 'en' | 'he'

export function getLocaleClaim(event: APIGatewayProxyEventV2WithJWTAuthorizer): Locale | null {
  const raw = event.requestContext.authorizer?.jwt?.claims?.['custom:locale']
  return raw === 'en' || raw === 'he' ? raw : null
}

export function resolveLocale(
  profile: Pick<UserProfileItem, 'preferredLanguage'> | undefined,
  claimLocale?: Locale | null
): Locale {
  return profile?.preferredLanguage ?? claimLocale ?? 'en'
}

/**
 * The one instruction line every Bedrock system prompt gets, via the new
 * `{{languageInstruction}}` template var. Deliberately one combined var,
 * not the plan doc's literal `{{language}}` (a bare "English"/"Hebrew"
 * word) plus a second gender var — `fillTemplate()` is a dumb string
 * replace with no conditional logic, so there's nowhere in the template
 * itself to say "only mention grammatical gender when the language is
 * Hebrew." Composing the whole sentence here in code keeps that
 * conditional where it belongs, at the cost of a name that no longer
 * matches the plan doc's own placeholder verbatim — noted here so a
 * future reader isn't confused by the mismatch.
 *
 * Grammatical-gender fallback for `unspecified` resolved with the user
 * this session: default to masculine forms (Hebrew's traditional
 * grammatically-unmarked default), not neutral/plural phrasing — simpler
 * to instruct reliably, and the user's own explicit choice over the
 * neutral-phrasing alternative that was offered.
 */
/**
 * For call sites with no existing profile read to reuse (e.g.
 * `companion/context.ts`'s pure-GET synthesis paths, which don't call
 * `requireConsent()`) and where the fast-path JWT claim alone isn't enough
 * because it doesn't carry `genderIdentity` — only `preferredLanguage` is
 * mirrored into a claim (`custom:locale`), gender never was. A small,
 * targeted read (not a call on every request — only where synthesis
 * actually fires) rather than extending Cognito's claims, since that would
 * touch `pre-token-generation.ts` (auth-adjacent, its own security-review
 * bar) for a gain this narrow. Degrades to `{ locale: 'en', gender:
 * 'unspecified' }` on any failure or missing profile — same tolerance every
 * other best-effort read in this codebase uses.
 */
export async function getProfileForLanguage(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string
): Promise<Pick<UserProfileItem, 'preferredLanguage' | 'genderIdentity'>> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.profile() } }))
    const profile = result.Item as UserProfileItem | undefined
    return {
      preferredLanguage: profile?.preferredLanguage ?? 'en',
      genderIdentity: profile?.genderIdentity ?? 'unspecified',
    }
  } catch {
    return { preferredLanguage: 'en', genderIdentity: 'unspecified' }
  }
}

export function toLanguageInstruction(locale: Locale, gender: GenderIdentity): string {
  if (locale === 'en') return 'Respond to the user entirely in English.'
  const grammaticalForm = gender === 'female' ? 'feminine' : 'masculine'
  return (
    'Respond to the user entirely in Hebrew (עברית). ' +
    `Address the user using ${grammaticalForm} grammatical forms for second-person verb conjugation.`
  )
}
