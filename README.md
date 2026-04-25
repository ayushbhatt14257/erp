# Cover ERP — Semi-Finished Goods Inventory System
## Step-by-Step Setup Guide

---

## WHAT YOU GET

- Module A: Stock In (with shift, machine, location)
- Module B: Stock Out (shift-gated, balance-guarded)
- Module C: Master Dashboard (real-time, socket-synced)
- Module D: Quick Search (read-only stock check)
- Module E: Order Fulfilment Check (upload Excel)
- Module F: Reports (monthly, auto-saved, Excel export)
- SKU Manager (add 5,000+ models, bulk import)

---

## REQUIREMENTS — INSTALL THESE FIRST

Before anything else, install these on your computer (Windows/Mac/Linux):

### 1. Node.js (version 18 or higher)
- Go to: https://nodejs.org
- Download the LTS version
- Install it (just click Next → Next → Install)
- To verify: open Command Prompt / Terminal and type:
  ```
  node --version
  ```
  You should see something like: v20.11.0

### 2. Git (optional but recommended)
- Go to: https://git-scm.com/downloads
- Install it

---

## STEP 1 — GET THE PROJECT FILES

Copy the `erp-project` folder to your computer.
It should look like this:

```
erp-project/
├── server/
│   ├── index.js
│   ├── package.json
│   ├── .env
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── utils/
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
```

---

## STEP 2 — IMPORTANT: CHANGE YOUR MONGODB PASSWORD

Your MongoDB Atlas password was shared in chat. Change it NOW:

1. Go to: https://cloud.mongodb.com
2. Sign in → click "Database Access" in the left menu
3. Find user "ayushbhatt1425" → click Edit
4. Click "Edit Password" → set a new strong password
5. Click "Update User"

Then update the `.env` file inside the `server/` folder:
```
MONGO_URI=mongodb+srv://ayushbhatt1425:YOUR_NEW_PASSWORD@cluster0.ud38zyk.mongodb.net/cover-erp?appName=Cluster0
```

Also change this line in `.env`:
```
JWT_SECRET=put_any_long_random_string_here_minimum_32_chars
```

---

## STEP 3 — INSTALL SERVER DEPENDENCIES

Open Command Prompt (Windows) or Terminal (Mac/Linux).

Navigate into the server folder:
```bash
cd erp-project/server
npm install
```

Wait for it to finish. You will see a `node_modules` folder appear.

---

## STEP 4 — INSTALL CLIENT DEPENDENCIES

Open a NEW terminal window (keep the first one open).

Navigate into the client folder:
```bash
cd erp-project/client
npm install
```

Wait for it to finish.

---

## STEP 5 — START THE SERVER

In your first terminal (inside the `server/` folder):
```bash
npm run dev
```

You should see:
```
✅ MongoDB Atlas connected
🚀 Server running on http://localhost:5000
```

If you see a MongoDB error, double-check your password in `.env`.

---

## STEP 6 — START THE CLIENT

In your second terminal (inside the `client/` folder):
```bash
npm run dev
```

You should see:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## STEP 7 — FIRST-TIME SETUP (DO THIS ONCE)

Open your browser and go to:
```
http://localhost:5173/setup
```

Follow the 3-step wizard:

**Step 1:** Create your admin account
- Enter your name (e.g. "Ayush Bhatt")
- Choose a username (e.g. "ayush") — this is what you type at login
- Choose a password (min 6 chars)
- Click "Create Admin Account"

**Step 2:** Seed master data
- Click "Set Up Master Data"
- This creates: M1–M10 machines, Row A–T, 4 departments
- Takes about 2 seconds

**Step 3:** Done!
- Click "Go to Dashboard"

---

## STEP 8 — ADD YOUR SKU LIST

Go to **SKU Manager** in the left menu.

**Option A — Add one by one:**
Type the model name (e.g. "Sam A55") and click Add.

**Option B — Bulk import (recommended for 5000+ models):**
Click "bulk import from text"
Paste your list, one model per line:
```
Sam A55
Sam A35
iP 16 Pro Max
iP 15 Plus
Vivo V40
OnePlus 13
```
Or with brand:
```
Sam A55, Samsung
iP 16PM, Apple
Vivo V40, Vivo
```
Click Import.

---

## STEP 9 — ACCESSING FROM OTHER DEVICES (4-DEVICE SYNC)

For godown workers and management to access from their phones/laptop on the same Wi-Fi:

1. Find your computer's IP address:
   - Windows: Open Command Prompt → type `ipconfig` → look for "IPv4 Address" (e.g. 192.168.1.100)
   - Mac: System Preferences → Network → look for IP address

2. Update `client/vite.config.js` — change the proxy target to your IP:
   ```js
   proxy: {
     '/api': { target: 'http://192.168.1.100:5000' },  // use your IP
   }
   ```

3. Restart the client (`Ctrl+C` then `npm run dev`)

4. Other devices on the same Wi-Fi open:
   ```
   http://192.168.1.100:5173
   ```

**For godown workers (read-only Quick Search):**
- Create worker login accounts from admin panel
- Workers get access to Quick Search only
- They log in and only see the search screen

---

## DAILY USAGE GUIDE

### Morning (start of shift):
1. Admin logs in on desktop/phone
2. Go to **Stock In**
3. Select Shift 1, machine, model, worker name, quantity, location
4. Submit — dashboard updates instantly on all devices

### When department takes stock:
1. Go to **Stock Out**
2. Select shift, model name, quantity, department, receiver
3. If shift gate blocks you → do Stock In first
4. Submit

### Workers checking stock:
1. Open browser → login with worker account
2. Quick Search → type model name → see balance + location

### Checking an incoming order:
1. Go to **Order Check**
2. Upload your Excel file (col A = model, col B = quantity)
3. See Ready / Partial / Short breakdown instantly
4. Download gap report if needed

### End of month:
- Reports are auto-generated on 1st of every month
- Or go to **Reports** → select month → click Excel download

---

## RUNNING ON RENDER (when you're ready to host online)

1. Push your code to GitHub (free account at github.com)
2. Go to render.com → New Web Service → connect your repo
3. Set the root directory to `server`
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables (same as your `.env` file)
7. For the client: New Static Site → root directory `client`
   → build command: `npm run build` → publish directory: `dist`
8. Update `CLIENT_URL` in server env vars to your Render client URL

---

## TROUBLESHOOTING

**"MongoDB connection error"**
→ Wrong password in `.env`. Update it and restart server.

**"Cannot find module"**
→ Run `npm install` again in that folder.

**"Port already in use"**
→ Something else is on port 5000 or 5173.
→ Change PORT in `.env` to 5001, and update vite.config.js proxy accordingly.

**SKU search shows nothing**
→ You haven't added any SKUs yet. Go to SKU Manager first.

**Stock Out says "Record Stock In first"**
→ This is the shift gate working correctly.
→ You must record at least one Stock In for that model in the current shift before taking it out.

**Other devices can't connect**
→ Make sure all devices are on the same Wi-Fi
→ Check Windows Firewall — allow Node.js through it
→ Use your computer's local IP (192.168.x.x), not "localhost"

---

## FILE STRUCTURE REFERENCE

```
server/
├── index.js              ← Main server entry point
├── .env                  ← Your credentials (never share this)
├── models/
│   ├── User.js           ← Login accounts
│   ├── SKU.js            ← 5000+ model names
│   ├── Transaction.js    ← Every stock movement
│   ├── Report.js         ← Saved monthly reports
│   └── Masters.js        ← Machines, rows, departments
├── routes/
│   ├── auth.js           ← Login, user management
│   ├── skus.js           ← Model search + management
│   ├── transactions.js   ← Stock In / Stock Out
│   ├── dashboard.js      ← Dashboard aggregations
│   ├── orders.js         ← Order check / Excel upload
│   ├── reports.js        ← Monthly reports + export
│   └── masters.js        ← Machines, rows, departments
├── middleware/
│   └── auth.js           ← JWT verification
└── utils/
    └── reportGenerator.js ← Monthly report logic

client/src/
├── App.jsx               ← Router + sidebar + mobile nav
├── index.css             ← All styles
├── context/
│   └── AuthContext.jsx   ← Global login state
├── utils/
│   └── api.js            ← Axios + Socket.IO setup
├── pages/
│   ├── Login.jsx         ← Login screen
│   └── Setup.jsx         ← First-time setup wizard
└── components/modules/
    ├── Dashboard.jsx     ← Module C
    ├── StockIn.jsx       ← Module A
    ├── StockOut.jsx      ← Module B
    ├── QuickSearch.jsx   ← Module D
    ├── OrderCheck.jsx    ← Module E
    ├── Reports.jsx       ← Module F
    ├── SkuManager.jsx    ← SKU management
    └── shared/
        └── SkuSearch.jsx ← Reusable search dropdown
```
