import OpenAI from 'openai'

// Lazy clients and config
function getEmergentClient() {
  return new OpenAI({
    apiKey: process.env.EMERGENT_LLM_KEY,
    baseURL: 'https://llm.kindo.ai/v1'
  })
}

const getOllamaConfig = () => ({
  endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
  key: process.env.OLLAMA_KEY_1
})

export async function generateMotivationalQuote() {
  try {
    const emergentClient = getEmergentClient()
    const response = await emergentClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a motivational coach. Generate a short, powerful motivational quote (max 20 words) about habits, discipline, or personal growth.'
        },
        { role: 'user', content: 'Generate a motivational quote for today.' }
      ],
      max_tokens: 50,
      temperature: 0.9
    })
    return response.choices[0].message.content
  } catch (error) {
    console.error('Quote generation error:', error)
    return '"Small steps every day lead to massive results." - FITOX'
  }
}

export async function generateChatResponse(messages, userContext = {}) {
  const systemPrompt = `You are FITOX AI Coach - an empathetic and motivational habit coach.

Your role:
- Help users build and maintain positive habits
- Provide discipline and motivation
- Give practical, actionable advice
- Keep responses SHORT and powerful (2-3 sentences max)
- Be encouraging but honest
- Focus on consistency over perfection

User Context:
- Completed Tasks: ${userContext.completedTasks || 0}
- Pending Tasks: ${userContext.pendingTasks || 0}
- Current Streak: ${userContext.streak || 0} days

Tone: Friendly, motivational, and supportive. No medical advice.`

  try {
    // Primary: Emergent LLM (created lazily)
    const emergentClient = getEmergentClient()
    const response = await emergentClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 150,
      temperature: 0.7
    })
    return {
      content: response.choices[0].message.content,
      source: 'emergent'
    }
  } catch (emergentError) {
    console.error('Emergent LLM error:', emergentError)
    
    try {
      // Fallback: Ollama
      const { endpoint, key } = getOllamaConfig()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const ollamaResponse = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'Authorization': `Bearer ${key}` } : {})
        },
        body: JSON.stringify({
          model: 'llama3.1',
          prompt: `${systemPrompt}\n\nUser: ${messages[messages.length - 1].content}\n\nAssistant:`,
          stream: false
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)
      const ollamaData = await ollamaResponse.json().catch(() => ({}))
      return {
        content: ollamaData.response || 'Stay focused on your goals! Every day is a new opportunity.',
        source: 'ollama'
      }
    } catch (ollamaError) {
      console.error('Ollama fallback error:', ollamaError)
      return {
        content: 'Keep pushing forward! Remember, consistency beats perfection. You\'ve got this! 💪',
        source: 'fallback'
      }
    }
  }
}
