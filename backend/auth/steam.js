const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const router = express.Router();

// --- ENV sanity ---
const CLIENT_URL = process.env.CLIENT_URL;            // e.g. https://game.kyle-white.com
const RETURN_URL = process.env.STEAM_RETURN_URL;      // e.g. https://api.kyle-white.com/auth/steam/return
const REALM      = process.env.STEAM_REALM;           // e.g. https://api.kyle-white.com
const API_KEY    = process.env.STEAM_API_KEY;

if (!CLIENT_URL || !RETURN_URL || !REALM || !API_KEY) {
  console.warn('[steam] Missing env vars:', { CLIENT_URL, RETURN_URL, REALM, API_KEY: !!API_KEY });
}

// --- Passport Setup ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

console.log('🌐 STEAM_REALM:', REALM);
console.log('🔁 STEAM_RETURN_URL:', RETURN_URL);
console.log('🎯 CLIENT_URL:', CLIENT_URL);

passport.use(new SteamStrategy(
  {
    returnURL: RETURN_URL,
    realm: REALM,
    apiKey: API_KEY,
  },
  (identifier, profile, done) => {
    process.nextTick(() => {
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

// --- Steam Auth Routes ---

// Step 1: Initiate login
router.get('/steam', (req, res, next) => {
  console.log('🚀 [steam] /auth/steam hit');
  next();
}, passport.authenticate('steam'));

// Step 2: Handle return from Steam
router.get(
  '/steam/return',
  (req, res, next) => {
    console.log('⬅️ [steam] /auth/steam/return hit');
    next();
  },
  passport.authenticate('steam', { failureRedirect: `${CLIENT_URL}/login?err=steam_callback` }),
  (req, res) => {
    console.log('✅ [steam] Authenticated:', req.user?.id || 'unknown');
    const target = `${CLIENT_URL}/gameAI`;
    console.log('➡️ Redirecting to:', target);
    res.redirect(target);
  }
);

// Who am I?
router.get('/user', (req, res) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

// Optional: logout helper
router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

module.exports = router;