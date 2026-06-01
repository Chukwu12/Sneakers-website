# Onice Kicks

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?logo=javascript&logoColor=000)
![Status](https://img.shields.io/badge/Status-Active-success)
![Repo Size](https://img.shields.io/github/repo-size/Chukwu12/Sneakers-website)
![Last Commit](https://img.shields.io/github/last-commit/Chukwu12/Sneakers-website)

A modern sneaker storefront experience with API-powered collection browsing, a dynamic lookbook gallery, and a server-backed portfolio watchlist.

</div>

---

## ✨ Highlights

- API-driven sneaker data from a KicksDB/StockX proxy endpoint
- Dynamic Collection filters generated from real sneaker metadata
- Gallery Lookbook with featured sneaker rotation, lightbox, and related sneaker rail
- Portfolio watchlist with:
  - save/remove actions
  - target price editing
  - sorting (Most Recent, Below Target, Highest Upside)
- File-based watchlist persistence via Express backend (`backend/data/watchlist.json`)
- Responsive navbar and consistent page behavior across Home, Gallery, Collection, and Portfolio

---

## 🧱 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express 5, CORS, dotenv
- **Data source:** KicksDB API proxy (`/api/sneakers`)
- **Storage:** JSON file persistence for watchlist (`backend/data/watchlist.json`)

---

## 📁 Project Structure

```text
Sneakers-website/
├── index.html
├── gallery.html
├── collection.html
├── Profolio.html
├── css/
│   ├── index.css
│   ├── gallery.css
│   ├── collection.css
│   └── profolio.css
├── img/
├── assets/
├── backend/
│   ├── main.js          # Shared frontend behavior loaded by pages
│   ├── server.js        # Express API server + sneakers proxy + watchlist CRUD
│   ├── .env             # Environment variables
│   └── data/
│       └── watchlist.json
├── package.json
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone

```bash
git clone https://github.com/Chukwu12/Sneakers-website.git
cd Sneakers-website
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create/edit `backend/.env`:

```env
PORT=3001
KICKS_DB_API=your_kicksdb_api_key
```

> If `KICKS_DB_API` is not set, the server uses the fallback value currently defined in `backend/server.js`.

### 4. Start backend

```bash
npm start
```

Server runs on:

- `http://localhost:3001`

### 5. Open frontend

Serve/open the HTML pages with your preferred static server or VS Code Live Server:

- `index.html`
- `gallery.html`
- `collection.html`
- `Profolio.html`

---

## 🔌 API Endpoints

### Sneakers

- `GET /api/sneakers`
  - Proxies sneaker products from KicksDB API

### Watchlist

- `GET /api/watchlist`
  - Returns all saved watchlist items
- `POST /api/watchlist`
  - Creates or updates a watchlist item by `id`
- `PATCH /api/watchlist/:id`
  - Updates `targetPrice` for a saved item
- `DELETE /api/watchlist/:id`
  - Removes an item from watchlist

---

## 🧠 Frontend Behavior Notes

- Shared page logic lives in `backend/main.js`
- API base resolution supports:
  - localhost development
  - GitHub Codespaces preview host mapping (`-5500` frontend to `-3001` backend)
  - same-origin production behavior
- Description text for Gallery, Collection, and Home cards is cleaned and truncated for a modern UI layout

---

## 🚀 Scripts

```bash
npm start   # Runs: node backend/server.js
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m "feat: add your feature"`)
4. Push branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 📌 Roadmap Ideas

- Add search + pagination on Collection
- Add auth/user-based watchlists
- Move watchlist storage from JSON file to a database
- Add test coverage for API routes and UI interactions

---

## 👤 Author

Built by **Chukwu12**

- GitHub: https://github.com/Chukwu12
- Repository: https://github.com/Chukwu12/Sneakers-website
