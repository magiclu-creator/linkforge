const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { linksDB, clicksDB } = require('../models/database');
const { createShortCode, isValidUrl, normalizeUrl, parseUserAgent, getGeoInfo } = require('../utils/helpers');

// Rate limiting
const rateLimit = require('express-rate-limit');
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many links. Try again later.' },
});

// Create a short link
router.post('/api/links', createLimiter, (req, res) => {
  try {
    let { url, title, customCode, tags } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    url = normalizeUrl(url);
    if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL' });

    let shortCode = customCode || createShortCode();

    if (customCode) {
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(customCode)) {
        return res.status(400).json({ error: 'Custom code: 3-30 chars, alphanumeric with - or _' });
      }
      if (linksDB.findOne({ short_code: customCode })) {
        return res.status(409).json({ error: 'Custom code already taken' });
      }
    }

    const link = linksDB.insert({
      short_code: shortCode,
      original_url: url,
      title: title || null,
      created_at: new Date().toISOString(),
      is_active: 1,
      click_count: 0,
      user_id: req.ip || 'anonymous',
      tags: JSON.stringify(tags || []),
    });

    res.status(201).json({
      success: true,
      data: {
        id: link.id,
        shortCode: link.short_code,
        shortUrl: `${req.protocol}://${req.get('host')}/${link.short_code}`,
        originalUrl: link.original_url,
        title: link.title,
        createdAt: link.created_at,
        qrCode: `${req.protocol}://${req.get('host')}/api/qr/${link.short_code}`,
      },
    });
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get link stats
router.get('/api/links/:code/stats', (req, res) => {
  try {
    const { code } = req.params;
    const link = linksDB.findOne({ short_code: code });
    if (!link) return res.status(404).json({ error: 'Link not found' });

    const allClicks = clicksDB.findMany({ link_id: link.id });

    // Clicks by day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const recentClicks = allClicks.filter(c => c.clicked_at >= thirtyDaysAgo);

    const clicksByDay = {};
    recentClicks.forEach(c => {
      const date = c.clicked_at.split('T')[0];
      clicksByDay[date] = (clicksByDay[date] || 0) + 1;
    });

    const clicksByDayArr = Object.entries(clicksByDay)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Referrers
    const refCounts = {};
    allClicks.filter(c => c.referer).forEach(c => {
      refCounts[c.referer] = (refCounts[c.referer] || 0) + 1;
    });
    const topReferrers = Object.entries(refCounts)
      .map(([referer, count]) => ({ referer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Devices
    const devCounts = {};
    allClicks.forEach(c => { devCounts[c.device_type || 'unknown'] = (devCounts[c.device_type || 'unknown'] || 0) + 1; });
    const devices = Object.entries(devCounts).map(([device_type, count]) => ({ device_type, count }));

    // Browsers
    const brCounts = {};
    allClicks.forEach(c => { brCounts[c.browser || 'unknown'] = (brCounts[c.browser || 'unknown'] || 0) + 1; });
    const browsers = Object.entries(brCounts).map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Countries
    const coCounts = {};
    allClicks.forEach(c => { coCounts[c.country || 'Unknown'] = (coCounts[c.country || 'Unknown'] || 0) + 1; });
    const countries = Object.entries(coCounts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    res.json({
      success: true,
      data: {
        link: {
          id: link.id,
          shortCode: link.short_code,
          shortUrl: `${req.protocol}://${req.get('host')}/${link.short_code}`,
          originalUrl: link.original_url,
          title: link.title,
          createdAt: link.created_at,
          isActive: link.is_active,
        },
        stats: {
          totalClicks: allClicks.length,
          clicksByDay: clicksByDayArr,
          topReferrers,
          devices,
          browsers,
          countries,
        },
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate QR Code
router.get('/api/qr/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const link = linksDB.findOne({ short_code: code });
    if (!link) return res.status(404).json({ error: 'Link not found' });

    const { size, color, bg, format } = req.query;
    const qrSize = parseInt(size) || 300;
    const darkColor = color || '#000000';
    const lightColor = bg || '#ffffff';
    const shortUrl = `${req.protocol}://${req.get('host')}/${link.short_code}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(shortUrl, {
        type: 'svg', width: qrSize,
        color: { dark: darkColor, light: lightColor }, margin: 2,
      });
      res.type('svg').send(svg);
    } else {
      const buffer = await QRCode.toBuffer(shortUrl, {
        width: qrSize,
        color: { dark: darkColor, light: lightColor },
        margin: 2, errorCorrectionLevel: 'M',
      });
      res.type('png').send(buffer);
    }
  } catch (error) {
    console.error('QR error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// List recent links
router.get('/api/links', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const allActive = linksDB.findMany({ is_active: 1 }, { limit, skip, sort: { created_at: -1 } });
    const total = linksDB.count({ is_active: 1 });

    res.json({
      success: true,
      data: allActive.map(l => ({
        id: l.id,
        shortCode: l.short_code,
        shortUrl: `${req.protocol}://${req.get('host')}/${l.short_code}`,
        originalUrl: l.original_url,
        title: l.title,
        clickCount: l.click_count || 0,
        createdAt: l.created_at,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a link
router.delete('/api/links/:code', (req, res) => {
  try {
    const { code } = req.params;
    const result = linksDB.updateOne({ short_code: code }, { is_active: 0 });
    if (!result) return res.status(404).json({ error: 'Link not found' });
    res.json({ success: true, message: 'Link deactivated' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect handler
router.get('/:code', (req, res) => {
  try {
    const { code } = req.params;
    if (code.startsWith('api') || code.startsWith('dashboard') || code === 'favicon.ico') {
      return res.status(404).send('Not found');
    }

    const link = linksDB.findOne({ short_code: code, is_active: 1 });
    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><title>404 - LinkForge</title>
        <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0f172a;color:#e2e8f0;margin:0}
        .c{text-align:center}h1{font-size:4rem;color:#818cf8}p{color:#94a3b8}a{color:#818cf8}</style></head>
        <body><div class="c"><h1>404</h1><p>This link does not exist or has expired.</p><a href="/">Back to LinkForge</a></div></body></html>
      `);
    }

    // Track click
    setImmediate(() => {
      try {
        const ua = parseUserAgent(req.headers['user-agent'] || '');
        const geo = getGeoInfo(req.ip);

        clicksDB.insert({
          link_id: link.id,
          clicked_at: new Date().toISOString(),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'] || '',
          referer: req.headers['referer'] || '',
          country: geo.country,
          city: geo.city,
          device_type: ua.deviceType,
          browser: ua.browser,
          os: ua.os,
        });

        linksDB.updateOne({ id: link.id }, { click_count: (link.click_count || 0) + 1 });
      } catch (e) {
        console.error('Click tracking error:', e);
      }
    });

    res.redirect(302, link.original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
