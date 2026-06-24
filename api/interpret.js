export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Accept both {prompt} (new) and Anthropic {messages} format (old/cached)
    let prompt = body?.prompt;
    if (!prompt && body?.messages?.length) {
      const last = body.messages[body.messages.length - 1];
      prompt = typeof last.content === 'string' ? last.content : last.content?.[0]?.text;
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Gemini error', detail: data });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: err.message });
  }
}
