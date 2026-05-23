# Saguni Gaming Cafe Website

Static booking website for Saguni Gaming Cafe.

## Upload To GitHub Pages

Upload these files to the root of your GitHub repository:

- `index.html`
- `styles.css`
- `script.js`
- `firebase-config.js`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `404.html`
- `.nojekyll`
- `README.md`

Then open GitHub repository `Settings` -> `Pages` and choose:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

## Pricing

- Gaming PC: Rs 120 per hour per player
- PS5 Bay: Rs 100 for one player per hour
- PS5 Bay: Rs 180 for two players on one PS5 per hour
- Squad Block: Rs 450 per hour

Bookings are saved locally in the browser.

## Firebase Setup

GitHub Pages only hosts the website. Firebase is needed if you want bookings saved online.

1. Create a Firebase project.
2. Enable Firestore Database.
3. Create a Firebase Web App.
4. Paste the Web App config into `firebase-config.js`.
5. Deploy Firestore rules with Firebase CLI:

```bash
firebase login
firebase deploy --only firestore
```

Until `firebase-config.js` has real values, bookings still work locally in the browser.
