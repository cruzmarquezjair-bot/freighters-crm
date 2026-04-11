/**
 * Freighters Personal CRM - Backend Server
 */
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'crm.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_line TEXT NOT NULL CHECK(business_line IN ('TWT','DAIRAL','FREIGHTERS')),
    client TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    route TEXT DEFAULT '',
    equipment TEXT DEFAULT '',
    status TEXT DEFAULT 'Prospect',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate existing DB columns
try { db.exec(`ALTER TABLE clients ADD COLUMN contact TEXT DEFAULT ''`); } catch(e) {}
try { db.exec(`ALTER TABLE clients ADD COLUMN equipment TEXT DEFAULT ''`); } catch(e) {}

const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
if (!existingUser) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('roberto', hash);
  console.log('Default user created: roberto / admin123');
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'freighters-crm-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7*24*60*60*1000 }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) res.json({ loggedIn: true, username: req.session.username });
  else res.json({ loggedIn: false });
});

app.get('/api/clients', requireAuth, (req, res) => {
  const { line } = req.query;
  const rows = line
    ? db.prepare('SELECT * FROM clients WHERE business_line = ? ORDER BY sort_order ASC, id ASC').all(line)
    : db.prepare('SELECT * FROM clients ORDER BY business_line, sort_order ASC, id ASC').all();
  res.json(rows);
});

app.post('/api/clients', requireAuth, (req, res) => {
  const { business_line, client, contact, phone, email, route, equipment, status } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM clients WHERE business_line = ?').get(business_line);
  const nextOrder = (maxOrder.m || 0) + 1;
  const result = db.prepare(`
    INSERT INTO clients (business_line, client, contact, phone, email, route, equipment, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(business_line, client||'', contact||'', phone||'', email||'', route||'', equipment||'', status||'Prospect', nextOrder);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/clients/:id', requireAuth, (req, res) => {
  const { client, contact, phone, email, route, equipment, status } = req.body;
  db.prepare(`
    UPDATE clients SET client=?, contact=?, phone=?, email=?, route=?, equipment=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(client, contact, phone, email, route, equipment, status, req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

app.delete('/api/clients/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(400).json({ error: 'Current password is incorrect' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.session.userId);
  res.json({ success: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`\n🚚 Freighters CRM running at http://localhost:${PORT}\n`));
