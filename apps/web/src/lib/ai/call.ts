import OpenAI from 'openai'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function aiCall(
  system: string,
  user: string
): Promise<{ text: string; tokensUsed: number }> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return {
    text: response.choices[0].message.content ?? '',
    tokensUsed: response.usage?.total_tokens ?? 0,
  }
}

export async function aiCallJSON<T>(
  system: string,
  user: string
): Promise<{ data: T; tokensUsed: number }> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 600,
    temperature: 0.7,
  })

  const text = response.choices[0].message.content ?? '{}'
  return {
    data: JSON.parse(text) as T,
    tokensUsed: response.usage?.total_tokens ?? 0,
  }
}
