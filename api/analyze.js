export default async function handler(req, res) {
  // 1. Validate request method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullPrompt } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  // 2. Validate API key environment variable
  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is not configured in Vercel environment variables."
    });
  }

  // 3. Build payload for Groq OpenAI-compatible endpoint
  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an automated code analysis engine. Directly output clean, structured Markdown matching the requested format. Avoid conversational filler or internal thinking steps."
      },
      {
        role: "user",
        content: fullPrompt
      }
    ],
    temperature: 0.2,
    max_tokens: 700
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Upstream model error"
      });
    }

    // 4. Map the response format to match what script.js expects
    const textOutput = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({
      candidates: [
        {
          content: {
            parts: [{ text: textOutput }]
          }
        }
      ]
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Internal server error"
    });
  }
}