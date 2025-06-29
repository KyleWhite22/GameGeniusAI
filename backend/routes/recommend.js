const express = require('express');
const router = express.Router();
console.log("🔑 OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);

router.post('/', async (req, res) => {
  try {
    const { gamesWithTags } = req.body;

    if (!Array.isArray(gamesWithTags)) {
      return res.status(400).json({ error: 'Invalid games format' });
    }

    // ✅ Extract and flatten all tags
    const allTags = gamesWithTags.flatMap(game => game.tags || []);
    const uniqueTags = [...new Set(allTags)];
    console.log("Incoming topGames payload:", gamesWithTags);
    console.log("Extracted tags:", uniqueTags);

    // ✅ Create a fake recommendation using the tags
    //const recommendations = `Because you enjoy games with tags like: ${uniqueTags.join(', ')}, you might like Hades, Hollow Knight, or Slay the Spire.`;

    //res.json({ recommendations });
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Suggest 3 games based on these Steam tags: ${uniqueTags.join(', ')}. 
 Format the response nicely for display. Keep in the consistent format of #. game title then short description`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    });
console.log("🤖 Sending request to OpenAI...");

    res.json({ recommendations: completion.choices[0].message.content });
  } catch (err) {
console.error('🔥 Recommendation error:', err.response?.data || err.message || err);
  res.status(500).json({ error: 'Failed to fetch recommendation from OpenAI' });
}
});

module.exports = router;
