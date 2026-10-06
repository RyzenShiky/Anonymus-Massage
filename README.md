# anonmsg — Spark

## Sebelum rilis

1. **Test rules** (paling penting):
   ```bash
   firebase emulators:exec --only firestore "cd tests/rules && npm i && npm test"
   ```
2. Isi `RECAPTCHA_SITE_KEY` di `src/core/config/app-check.config.js`
3. Auth: Email, Google, **Anonymous** — cek apakah App Check bisa enforce Auth
4. Deploy rules + hosting, baru **Enforce** Firestore
5. Beta tertutup + pantau kuota harian

## Build ini

| Item | Status |
|------|--------|
| `existsAfter` registrasi batch | OK |
| App Check main + anonSender | OK (isi key) |
| Chat 2 arah my-sends | OK |
| users **delete** | Dilarang |
| Username terlarang | rules + client |
| CSP `script-src` tanpa unsafe-inline | OK (skrip eksternal) |
| Rules unit tests | `tests/rules/` |
| Block / appeals / hapus akun | Belum |

## Kuota

~**4 write**/kirim → ~5k pesan/hari di batas 20k write.

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```


## GitHub Pages

Gunakan **user site** `USERNAME.github.io` (repo root = site root) agar path `/src/...` jalan.

1. Push repo ke `USERNAME.github.io`
2. Firebase Console → Authentication → Authorized domains → tambah `USERNAME.github.io`
3. reCAPTCHA / App Check: daftarkan domain github.io
4. Rules tetap: `firebase deploy --only firestore:rules,firestore:indexes`
5. Link profil memakai `u.html?u=name` (tanpa rewrite Hosting)
6. Root `index.html` mengalihkan ke `public/index.html`

Share ke story: tombol di inbox → PNG 9:16 → `navigator.share` atau unduh.
