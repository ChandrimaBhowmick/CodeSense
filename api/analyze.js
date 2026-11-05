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

  // Tiered fallback sequence: if flash is experiencing peak demand, fall back to flash-lite
  const models = ["gemini-3.8-flash", "gemini-3.8-flash-lite"];
  let lastErrorMessage = "Service temporarily unavailable. Please try again.";

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // Check for transient high-demand (503) or rate-limit (429) errors
      if (response.status === 503 || response.status === 429) {
        lastErrorMessage = data.error?.message || "Model experiencing high demand.";
        continue; // Try next model in candidate list
      }

      // If it's a structural client/auth error (e.g., 400 or 401), fail immediately
      return res.status(response.status).json({ error: data.error?.message || "Upstream model error" });
    } catch (err) {
      lastErrorMessage = err.message;
    }
  }

  return res.status(503).json({ error: lastErrorMessage });
}