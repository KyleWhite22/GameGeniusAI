const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const router = express.Router();

// --- Passport Setup ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
console.log('🌐 STEAM_REALM:', process.env.STEAM_REALM);

passport.use(new SteamStrategy(
  {
    returnURL: process.env.STEAM_RETURN_URL,
    realm: process.env.STEAM_REALM,
    apiKey: process.env.STEAM_API_KEY
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
router.get('/steam/return', (req, res, next) => {
  console.log('⬅️ [steam] /auth/steam/return hit');
  next();
}, passport.authenticate('steam', { failureRedirect: '/' }),
(req, res) => {
  console.log('✅ [steam] Authenticated:', req.user);
  console.log('➡️ Redirecting to:', `${process.env.CLIENT_URL}/GameAI`);
  res.redirect(`${process.env.CLIENT_URL}/GameAI`);
});

// ✅ NEW: Return current authenticated user
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

module.exports = router;
