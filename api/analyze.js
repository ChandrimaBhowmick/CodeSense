export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullPrompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured in environment variables." });
  }

  const payload = {
    systemInstruction: {
      parts: [{
        text: "You are an automated code analysis engine. Directly output clean, structured Markdown matching the requested format. Avoid conversational filler, self-introductions, or internal thinking steps."
      }]
    },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.1
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

  const maxRetries = 3;
  let lastErrorMessage = "Service temporarily unavailable. Please try again.";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
        continue;
      }

      return res.status(response.status).json({
        error: data.error?.message || "Upstream model error"
      });
    } catch (err) {
      lastErrorMessage = err.message;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
        continue;
      }
    }
  }

  return res.status(503).json({ error: lastErrorMessage });
}