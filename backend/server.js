require('dotenv').config();
console.log('CLIENT_URL:', process.env.CLIENT_URL);

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

const steamAuth = require('./auth/steam');
const gamesRoute = require('./routes/games'); // ✅ NEW
const steamTagsRoute = require('./routes/steamTags');
const recommendRoute = require('./routes/recommend');

const app = express();


app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use('/auth', steamAuth);
app.use('/api/games', gamesRoute); // ✅ NEW
app.use('/api', steamTagsRoute);
app.use('/api/recommend', recommendRoute);  // New recommendation route


try {
  app.listen(5000, () => {
    console.log('✅ Server listening on http://localhost:5000');
  });
} catch (err) {
  console.error('❌ Server crashed at startup:', err);
}
