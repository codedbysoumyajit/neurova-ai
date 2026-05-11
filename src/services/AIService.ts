const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AIMessage {
  role: 'user' | 'model' | 'assistant';
  parts?: { text: string }[];
  content?: string;
}

export class AIService {
  static async sendMessage(
    messages: AIMessage[],
    model: string,
    geminiKey: string,
    openRouterKey: string
  ): Promise<string> {
    const isGemini = model.startsWith('gemini');

    if (isGemini) {
      if (!geminiKey) throw new Error('Gemini API key is required for this model.');
      
      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: m.parts || [{ text: m.content || '' }],
      }));

      const url = `${GEMINI_API_URL}/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMessages }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      if (!candidate) throw new Error('Gemini returned no candidates.');

      return candidate.content?.parts?.map((p: any) => p.text).join('') ?? '';
    } else {
      // OpenRouter Model
      if (!openRouterKey) throw new Error('OpenRouter API key is required for this model.');

      const openRouterMessages = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content || m.parts?.[0]?.text || '',
      }));

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://neurova.ai',
          'X-Title': 'Neurova AI',
        },
        body: JSON.stringify({
          model: model,
          messages: openRouterMessages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    }
  }
}
