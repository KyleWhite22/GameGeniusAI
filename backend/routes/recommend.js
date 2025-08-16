const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

console.log("🔑 OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);

router.post('/', async (req, res) => {
  try {
    const { gamesWithTags } = req.body;

    if (!Array.isArray(gamesWithTags) || gamesWithTags.length === 0) {
      return res.status(400).json({ error: 'Invalid games format' });
    }

    // Build per-game lines: "Title — tag1, tag2, tag3"
    const perGameLines = gamesWithTags.map(g => {
      const title = g.name || g.title || `App ${g.appid}`;
      const tags = Array.isArray(g.tags) && g.tags.length ? g.tags.join(', ') : 'no tags';
      return `${title} — ${tags}`;
    });

    // Global tag pool (unique)
    const allTags = gamesWithTags.flatMap(g => Array.isArray(g.tags) ? g.tags : []);
    const uniqueTags = [...new Set(allTags)];

    console.log("Incoming topGames payload:", gamesWithTags);
    console.log("Extracted tags:", uniqueTags);

    // Compose prompt using both titles and tags
    const hasAnyTags = uniqueTags.length > 0;
    const system = "You are an expert game recommender. Be concise, specific, and on-topic.";
    const user = [
      "Suggest 3 PC games the user is likely to enjoy based on their selected games.",
      "",
      "Selected games (title — tags):",
      perGameLines.map(s => `- ${s}`).join('\n'),
      hasAnyTags ? `\nOverall tag pool: ${uniqueTags.join(', ')}` : "",
      "",
      "Output as a numbered list (1–3):",
      "1) Game Title — one short sentence why (reference matching tags or similar mechanics).",
      "Do not recommend games already in the selected list."
    ].join('\n');
    console.log("request", user);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("🤖 Sending request to OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // keep your current model; upgrade if you want stronger recs
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from OpenAI");

    res.json({ recommendations: text });
  } catch (err) {
    console.error('🔥 Recommendation error:', err.response?.data || err.message || err);

    // Simple fallback so the UI still shows something
    const fallback = `Based on your selected games${req?.body?.gamesWithTags?.length ? '' : ''}${
      Array.isArray(req?.body?.gamesWithTags)
        ? ' (' + req.body.gamesWithTags.map(g => g.name).filter(Boolean).join(', ') + ')'
        : ''
    }${(req?.body?.gamesWithTags?.some(g => g.tags?.length)) ? ' and their tags' : ''}, you might enjoy: Hades, Hollow Knight, or Slay the Spire.`;

    res.status(200).json({ recommendations: fallback });
  }
});

module.exports = router;