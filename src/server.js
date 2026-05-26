const express = require('express');
const cors = require('cors');
const path = require('path');
const linkRoutes = require('./routes/links');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Pages
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'pricing.html')));

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'LinkForge', version: '1.1.0' }));
app.use('/', authRoutes);
app.use('/', linkRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`\n  🔗 LinkForge v1.1.0`);
  console.log(`  ├─ Home:     http://localhost:${PORT}`);
  console.log(`  ├─ Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`  ├─ Pricing:  http://localhost:${PORT}/pricing`);
  console.log(`  └─ API:      http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
