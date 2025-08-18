require('dotenv').config();

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

const app = express();

const isProd = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (isProd
  ? 'https://game.kyle-white.com'
  : 'http://localhost:5173'
);
const API_ORIGIN = isProd ? 'https://api.kyle-white.com' : 'http://localhost:5000';

console.log('ENV:', { NODE_ENV: process.env.NODE_ENV, CLIENT_URL, API_ORIGIN });

// --- Mongo
mongoose.connect(process.env.MONGO_URI, {
  serverApi: { version: '1' },
  tls: true,
  tlsAllowInvalidCertificates: false,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB error:', err));

// --- CORS (allow frontend origin)
const PROD_ORIGINS = [
  'https://kyle-white.com',        // if you ever load from apex
  'https://www.kyle-white.com',    // if you ever load from www
  'https://game.kyle-white.com',   // <- main frontend
];
const DEV_ORIGINS = ['http://localhost:5173'];

const ALLOWLIST = isProd ? PROD_ORIGINS : DEV_ORIGINS;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);        // curl/postman
    if (ALLOWLIST.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
}));

// (Nice to have) respond to CORS preflights quickly
app.options('*', cors({ origin: ALLOWLIST, credentials: true }));

// --- Trust proxy so secure cookies work behind Nginx
app.set('trust proxy', isProd ? 1 : 0);

// --- Sessions (share across subdomains)
app.use(session({
  name: 'ggsid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: isProd,                   // requires HTTPS
    sameSite: isProd ? 'none' : 'lax',
    domain: isProd ? '.kyle-white.com' : undefined, // <- share across api. & game.
    maxAge: 1000 * 60 * 60 * 24 * 7,  // 7 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// --- Routes
// If your steamAuth router needs CLIENT_URL, pass it in (see note below)
app.use('/auth', steamAuth({ clientUrl: CLIENT_URL, apiOrigin: API_ORIGIN }));
app.use('/api/games', gamesRoute);
app.use('/api', steamTagsRoute);
app.use('/api/recommend', recommendRoute);

// --- Health & 404
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

// --- Start
app.listen(5000, '0.0.0.0', () => {
  console.log('✅ Server listening on http://localhost:5000');
});