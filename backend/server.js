require('dotenv').config();
console.log('CLIENT_URL:', process.env.CLIENT_URL);

const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');

const steamAuth = require('./auth/steam');
const gamesRoute = require('./routes/games');
const steamTagsRoute = require('./routes/steamTags');
const recommendRoute = require('./routes/recommend');

// ✅ DEFINE APP FIRST
const app = express();

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  serverApi: { version: '1' },
  tls: true,
  tlsAllowInvalidCertificates: false,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB error:', err));

const isProd = process.env.NODE_ENV === 'production';

// Allowed origins for CORS
const PROD_ORIGINS = [
  'https://kyle-white.com',
  'https://www.kyle-white.com'
];
const DEV_ORIGINS = [
  'http://localhost:5173'
];

// CORS
app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser tools without Origin header
    if (!origin) return cb(null, true);

    const allowed = isProd ? PROD_ORIGINS : DEV_ORIGINS;
    if (allowed.includes(origin)) return cb(null, true);

    return cb(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
}));

// Trust proxy (needed in prod behind Nginx so secure cookies work)
app.set('trust proxy', isProd ? 1 : 0);

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: isProd,             // requires HTTPS in prod
    sameSite: isProd ? 'none' : 'lax',
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// ✅ Routes
app.use('/auth', steamAuth);
app.use('/api/games', gamesRoute);
app.use('/api', steamTagsRoute);
app.use('/api/recommend', recommendRoute);

// ✅ Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});
// ✅ Start server
try {
  app.listen(5000, '0.0.0.0', () => {
    console.log('✅ Server listening on http://localhost:5000');
  });
} catch (err) {
  console.error('❌ Server crashed at startup:', err);
}
