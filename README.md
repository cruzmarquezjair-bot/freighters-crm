# 🚚 Freighters Personal CRM

A lightweight personal CRM for tracking clients across three business lines: **TWT**, **DAIRAL**, and **FREIGHTERS**.

---

## ⚡ Quick Start (Local)

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher

### Steps

```bash
# 1. Enter the project folder
cd freighters-crm

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open in browser
http://localhost:3000
```

### Default login
| Username | Password  |
|----------|-----------|
| `luis`   | `admin123` |

> **Change your password immediately** after first login via the ⚙️ Settings button.

---

## 📁 Project Structure

```
freighters-crm/
├── server.js              # Express backend (auth + REST API)
├── package.json
├── data/
│   └── crm.db             # SQLite database (auto-created on first run)
└── public/
    ├── index.html         # Single-page app
    ├── style.css          # All styles
    ├── app.js             # Frontend logic
    └── assets/
        └── logo.jpg       # Freighters logo
```

---

## 🌐 Deployment

### Option 1 — VPS / Cloud VM (Recommended)

**Ubuntu / Debian:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Start app with PM2
pm2 start server.js --name freighters-crm
pm2 save
pm2 startup  # follow the printed command

# App runs on port 3000
```

**Nginx reverse proxy (to serve on port 80/443):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Then run: `sudo certbot --nginx -d yourdomain.com` for free HTTPS.

### Option 2 — Railway.app (Easy Cloud Deploy)

1. Push project to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set `PORT` environment variable if needed
4. Done — Railway auto-detects Node.js and runs `npm start`

> **Note:** Railway uses an ephemeral filesystem. For persistent data, use a persistent volume or switch to a hosted SQLite alternative.

### Option 3 — Render.com

1. Push to GitHub
2. Create a new Web Service on [render.com](https://render.com)
3. Set Build Command: `npm install`
4. Set Start Command: `node server.js`
5. Add a Persistent Disk mounted at `/app/data` to keep the SQLite file

---

## 🔒 Security Notes

- Change the default password immediately after first login
- In production, set a strong session secret in `server.js` (`SESSION_SECRET` env var recommended)
- Enable HTTPS (set `secure: true` in session cookie config)
- The `data/` directory contains your database — back it up regularly

---

## ✏️ Customization

- **Add more statuses**: Edit the `STATUSES` array in `public/app.js` and the `<option>` tags in `index.html`
- **Change the port**: Set `PORT=8080` environment variable
- **Change login credentials**: Use the Settings panel in the app

---

## 📊 Features

- ✅ Three business line panels: TWT, DAIRAL, FREIGHTERS
- ✅ Inline cell editing with auto-save (800ms debounce)
- ✅ Column sorting (Client, Route, Status)
- ✅ Global client search
- ✅ Filter by status
- ✅ Add / delete rows
- ✅ Session-based authentication
- ✅ SQLite persistence (survives restarts)
- ✅ Fully responsive (desktop + mobile)
- ✅ Change password in settings
