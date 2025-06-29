const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/tags/:appid', async (req, res) => {
  const { appid } = req.params;
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    });

    const gameData = response.data[appid];
    if (!gameData || !gameData.success || !gameData.data) {
      console.warn(`⚠️ Steam returned no data for appid ${appid}`);
      return res.json({ tags: [] });
    }

    const categories = gameData.data.categories?.map(c => c.description) || [];
    const genres = gameData.data.genres?.map(g => g.description) || [];
    const tags = [...new Set([...categories, ...genres])];

    res.json({ tags });
  } catch (err) {
    console.error(`🔥 Error fetching tags for appid ${appid}:`, err.message);
    res.json({ tags: [] }); // don't crash
  }
});
router.get('/tags-test', async (req, res) => {
  try {
    const response = await axios.get('https://store.steampowered.com/api/appdetails?appids=620');
    res.json(response.data);
  } catch (err) {
    console.error('🚨 Steam test fetch failed:', err.message);
    res.status(500).json({ error: 'Steam unreachable' });
  }
});
module.exports = router;
