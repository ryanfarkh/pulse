# Pulse

Local-first fitness and study tracker. Dark, fast, installable on iPhone.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL on your Mac. On iPhone (same Wi‑Fi), use the Network address, e.g. `http://192.168.x.x:5173`.

## Add to iPhone home screen

1. Open the site in **Safari**
2. Share → **Add to Home Screen**
3. Offline caching works fully when the app is served over HTTPS (use `npm run build` + a host, or a tunnel). Local LAN HTTP still works as a live tracker.

## Backup between Mac and iPhone

Settings → **Export JSON** on one device, then **Import JSON** on the other. Data lives in `localStorage` only.
