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
        text: "You are an automated code analysis engine. Directly output clean, structured Markdown matching the requested format. Never output internal thought processes, planning stages, draft revisions, or constraint checklists."
      }]
    },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.1
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

  // Retry up to 3 times with a short pause if Google returns high demand / rate limits
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // Check if it is a transient demand or rate limit issue (503 / 429)
      const isTransient = response.status === 503 || response.status === 429;
      lastError = data.error?.message || "Upstream model error";

      if (isTransient && attempt < maxRetries) {
        // Wait 1.5s on attempt 1, 3s on attempt 2
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        continue;
      }

      return res.status(response.status).json({ error: lastError });
    } catch (err) {
      lastError = err.message;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        continue;
      }
    }
  }

  return res.status(503).json({ error: lastError });
}