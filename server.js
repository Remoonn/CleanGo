require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const crypto = require('crypto');

const app = express();
const registeredUsers = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = storedPassword.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.trim().replace(/\/$/, '');
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  return `${protocol}://${req.get('host')}`.replace(/\/$/, '');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('⚠️ SESSION_SECRET belum diatur. Tambahkan secret acak di environment Vercel.');
}

app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'cleango-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport serialize/deserialize
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Strategy
const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() &&
  process.env.GOOGLE_CLIENT_SECRET?.trim() &&
  !process.env.GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')
);

if (googleOAuthConfigured) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID.trim(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
    callbackURL: process.env.GOOGLE_CALLBACK_URL?.trim() || `${process.env.APP_URL?.trim().replace(/\/$/, '') || `http://localhost:${PORT}`}/auth/google/callback`,
    passReqToCallback: true
  }, (req, accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!profile.id || !email) {
      return done(new Error('Google tidak mengembalikan email pengguna. Pastikan scope email aktif.'));
    }

    return done(null, {
      id: profile.id,
      displayName: profile.displayName || email.split('@')[0],
      email,
      photo: profile.photos?.[0]?.value || null,
      provider: 'google'
    });
  }));
  console.log('✅ Google OAuth configured successfully');
} else {
  console.log('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  console.log('   Get credentials from: https://console.cloud.google.com/apis/credentials');
}

// ==================== ROUTES ====================

// Serve login page
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Email/Password Login (demo)
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email ? normalizeEmail(email) : '';
  
  // Validate credentials against users created in this server session
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email dan password harus diisi' 
    });
  }

  // Simple email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Format email tidak valid' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password minimal 6 karakter' 
    });
  }

  const account = registeredUsers.get(normalizedEmail);
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return res.status(401).json({
      success: false,
      message: 'Email atau password salah'
    });
  }

  const user = {
    id: account.id,
    displayName: account.name,
    email: account.email,
    photo: null,
    provider: 'email'
  };

  req.login(user, (err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Terjadi kesalahan pada server' 
      });
    }
    return res.json({ 
      success: true, 
      message: 'Login berhasil!',
      redirect: '/dashboard'
    });
  });
});

// Registration
app.post('/auth/register', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const normalizedEmail = email ? normalizeEmail(email) : '';

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Semua field harus diisi'
    });
  }

  if (name.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nama minimal 2 karakter'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Format email tidak valid'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password minimal 8 karakter'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password tidak cocok'
    });
  }

  if (registeredUsers.has(normalizedEmail)) {
    return res.status(409).json({
      success: false,
      message: 'Email sudah terdaftar. Silakan login.'
    });
  }

  registeredUsers.set(normalizedEmail, {
    id: Date.now().toString(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password)
  });

  return res.json({
    success: true,
    message: 'Registrasi berhasil! Silakan login dengan email dan password yang baru dibuat.',
    redirect: `/login?registered=true&email=${encodeURIComponent(normalizedEmail)}`
  });
});

// Google OAuth routes
app.get('/auth/google', (req, res, next) => {
  // Guard: If Google OAuth is not configured, redirect with error
  if (!googleOAuthConfigured) {
    return res.redirect('/login?error=google_not_configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'], state: true })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login?error=google_auth_failed' 
  }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Dashboard (protected route)
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API to get current user data
app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.json(req.user);
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    req.session.destroy();
    res.redirect('/login');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🧹 CleanGo Server running at http://localhost:${PORT}`);
  console.log(`📋 Login page: http://localhost:${PORT}/login\n`);
});
