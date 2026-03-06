export const sendMessageToAI = async (
  messages: { role: string; content: string }[],
  cityName: string,
  weatherInfo: string,
  onChunk: (text: string) => void
) => {
  const systemPrompt = `You are an AI travel assistant for the CityEnv dashboard.
The user is currently viewing data for ${cityName}.
Current conditions: ${weatherInfo}
Based on this environmental data, provide helpful travel and outdoor activity suggestions.
Keep responses concise and practical.`

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true
    })
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        const text = parsed.message?.content
        if (text) onChunk(text)
        if (parsed.done) return
      } catch {}
    }
  }
}