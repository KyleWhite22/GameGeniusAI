const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/user/:steamId', async (req, res) => {
  const { steamId } = req.params;
  const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=1`;

  try {
    const response = await axios.get(url);
    const games = response.data.response.games || [];

    const allGames = games.map(game => ({
      appid: game.appid,
      name: game.name,
      playtime_forever: game.playtime_forever,
      img_icon_url: game.img_icon_url
    }));

    // Filter out Wallpaper Engine (by appid or name)
    const filtered = allGames.filter(g =>
      g.appid !== 431960 &&
      !(g.name && g.name.toLowerCase().includes('wallpaper engine'))
    );

    // Pick top 3 from filtered list
    const topThree = [...filtered]
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 3)
      .map(game => ({
        ...game,
        tags: [] // Tags can be added later
      }));

    res.json({ allGames, topThree });
  } catch (err) {
    console.error('🔥 Error fetching games:', err.message);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

module.exports = router;
