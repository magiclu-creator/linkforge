const express = require('express');
const router = express.Router();

// API Key management (for paid users)
const apiKeys = new Map();
let keyCounter = 1;

// Generate API key
router.post('/api/auth/register', (req, res) => {
  try {
    const { email, plan } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const key = `lf_${plan || 'free'}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 8)}`;
    
    apiKeys.set(key, {
      email,
      plan: plan || 'free',
      createdAt: new Date().toISOString(),
      linkLimit: plan === 'business' ? Infinity : plan === 'pro' ? 5000 : 100,
      linksCreated: 0,
    });

    res.json({
      success: true,
      data: {
        apiKey: key,
        plan: plan || 'free',
        message: 'Save this API key securely. It will not be shown again.',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify API key
router.get('/api/auth/verify', (req, res) => {
  const key = req.headers['x-api-key'] || req.query.key;
  if (!key) return res.status(401).json({ error: 'API key required' });

  const user = apiKeys.get(key);
  if (!user) return res.status(403).json({ error: 'Invalid API key' });

  res.json({
    success: true,
    data: {
      email: user.email,
      plan: user.plan,
      linkLimit: user.linkLimit,
      linksCreated: user.linksCreated,
    },
  });
});

// Stripe webhook placeholder
router.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  // TODO: Implement Stripe webhook handling
  // 1. Verify webhook signature
  // 2. Handle events: checkout.session.completed, customer.subscription.updated, etc.
  // 3. Update user plan in database
  console.log('Stripe webhook received (placeholder)');
  res.json({ received: true });
});

// Paddle webhook placeholder  
router.post('/api/webhooks/paddle', (req, res) => {
  // TODO: Implement Paddle webhook handling
  console.log('Paddle webhook received (placeholder)');
  res.json({ received: true });
});

module.exports = router;
