require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const dramasRoutes = require('./routes/dramas');
const episodesRoutes = require('./routes/episodes');
const tokensRoutes = require('./routes/tokens');
const subscriptionsRoutes = require('./routes/subscriptions');
const webhooksRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');
const internalRoutes = require('./routes/internal');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe raw body endpoint must be registered before express.json()
app.use('/webhooks', webhooksRoutes);

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/dramas', dramasRoutes);
app.use('/episodes', episodesRoutes);
app.use('/tokens', tokensRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/admin', adminRoutes);
app.use('/internal', internalRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'showdrama-backend', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`ShowDrama Backend running on port ${PORT}`);
});
