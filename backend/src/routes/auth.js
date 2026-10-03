const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long';

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash,
          username: username || email.split('@')[0],
          token_balance: 10,
          subscription_status: 'free',
        },
      ])
      .select('id, email, username, token_balance, subscription_status, is_admin')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: error.message });
    }

    const token = jwt.sign({ id: data.id, email: data.email, is_admin: data.is_admin }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ user: data, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const identifier = req.body.email || req.body.username || req.body.identifier;
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password required' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`);

    const user = users && users.length > 0 ? users[0] : null;

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, {
      expiresIn: '7d',
    });

    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const { data: user } = await supabase.from('users').select('id, email, is_admin').eq('id', decoded.id).single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newToken = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
