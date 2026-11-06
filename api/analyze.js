export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullPrompt } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is not configured in Vercel environment variables."
    });
  }

  const payload = {
    model: "llama-3.1-8b-instant",
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