const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Simple JSON-based storage
class JsonDB {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = [];
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (e) {
      this.data = [];
    }
  }

  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  insert(record) {
    record.id = this.data.length > 0 ? Math.max(...this.data.map(r => r.id || 0)) + 1 : 1;
    this.data.push(record);
    this._save();
    return record;
  }

  findOne(query) {
    return this.data.find(record => {
      return Object.entries(query).every(([key, value]) => record[key] === value);
    }) || null;
  }

  findMany(query = {}, { limit = 100, skip = 0, sort = null } = {}) {
    let results = this.data.filter(record => {
      return Object.entries(query).every(([key, value]) => {
        if (value === undefined) return true;
        return record[key] === value;
      });
    });

    if (sort) {
      const [field, order] = Object.entries(sort)[0];
      results.sort((a, b) => {
        if (a[field] < b[field]) return order === 1 ? -1 : 1;
        if (a[field] > b[field]) return order === 1 ? 1 : -1;
        return 0;
      });
    }

    return results.slice(skip, skip + limit);
  }

  updateOne(query, update) {
    const record = this.findOne(query);
    if (record) {
      Object.assign(record, update);
      this._save();
      return record;
    }
    return null;
  }

  count(query = {}) {
    if (Object.keys(query).length === 0) return this.data.length;
    return this.data.filter(record => {
      return Object.entries(query).every(([key, value]) => record[key] === value);
    }).length;
  }
}

const linksDB = new JsonDB(LINKS_FILE);
const clicksDB = new JsonDB(CLICKS_FILE);

module.exports = { linksDB, clicksDB };
