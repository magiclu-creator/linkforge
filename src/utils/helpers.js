const { nanoid, customAlphabet } = require('nanoid');

// Custom alphabet for short codes (URL-safe, no ambiguous chars)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateShortCode = customAlphabet(alphabet, 7);

// Generate a random short code
function createShortCode(length = 7) {
  return generateShortCode();
}

// Validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

// Normalize URL (add https if missing)
function normalizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    return 'https://' + url;
  }
  return url;
}

// Parse user agent
function parseUserAgent(uaString) {
  const ua = require('useragent');
  const agent = ua.parse(uaString);
  
  let deviceType = 'desktop';
  const uaLower = uaString.toLowerCase();
  if (uaLower.includes('mobile') || uaLower.includes('android') || uaLower.includes('iphone')) {
    deviceType = 'mobile';
  } else if (uaLower.includes('tablet') || uaLower.includes('ipad')) {
    deviceType = 'tablet';
  }

  return {
    browser: agent.family,
    os: agent.os.toString(),
    deviceType,
  };
}

// Get geo info from IP
function getGeoInfo(ip) {
  try {
    const geoip = require('geoip-lite');
    // Handle localhost IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return { country: 'Local', city: 'Local' };
    }
    const geo = geoip.lookup(ip);
    if (geo) {
      return { country: geo.country, city: geo.city || 'Unknown' };
    }
  } catch (e) {}
  return { country: 'Unknown', city: 'Unknown' };
}

module.exports = {
  createShortCode,
  isValidUrl,
  normalizeUrl,
  parseUserAgent,
  getGeoInfo,
};
