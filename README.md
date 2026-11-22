# Invitación de boda

Single-page, mobile-first wedding invitation. Plain HTML/CSS/JS + GSAP (CDN). RSVPs go to a Google Form → Google Sheet.

```
index.html   markup + share-preview (Open Graph) tags
styles.css   mobile-first styles (breakpoints at 30rem / 48rem)
main.js      guest logic, RSVP submit, GSAP animations
config.js    ← all event content lives here
config.local.js  private values (Apps Script URL) — git-ignored
assets/      photos/ (placeholders to replace) + og.jpg for the link preview
```

## 1. Edit the content

Everything (names, date, venues, dress code, map, deadline, guest list) is in `config.js`.
Then update the `<title>` and `og:*` tags at the top of `index.html` — link previews can't read JS.

Set `reception: null` or `dressCode: ""` to hide those cards.

The countdown counts to `start` (with your time zone offset, e.g. `-06:00`). From `start` to `end` it shows "¡Hoy es el gran día!", and after `end` a thank-you message. Set `showCountdown: false` to hide it.

## Photos

All photo paths and alt texts live in `config.js`: `images` (hero, hero-wide, band, hero framing), `story.photos` (any number of `{ src, alt, caption }`) and `ceremony.photo` / `reception.photo`. Set a path to `""` (or a photo to `null`) to remove it. The layout adapts.

Easiest workflow: overwrite the labeled placeholders in `assets/photos/` with real photos of the same name. Or drop in new files and change the paths in `config.js`. Export as JPG, quality ~75–80, under ~300 KB each (squoosh.app works well).

The one exception is `assets/og.jpg` (link preview): it's set in `index.html` because WhatsApp doesn't run JavaScript.

| File | Where | Shape / size |
|---|---|---|
| `photos/hero.jpg` | Hero background on mobile | Vertical 1080×1920 — faces in the upper third |
| `photos/hero-wide.jpg` | Hero background on desktop | Horizontal 1920×1080 |
| `photos/story-1..3.jpg` | "Nuestra historia" gallery | Vertical 4:5, 1080×1350 |
| `photos/ceremony.jpg` | Ceremony card | 16:10, 1200×750 |
| `photos/reception.jpg` | Reception card | 16:10, 1200×750 |
| `photos/band.jpg` | Full-width quote band (parallax) | Horizontal 1920×1280, subject centered (mobile crops the sides) |
| `og.jpg` | WhatsApp / iMessage link preview | 1200×630 |

- Text sits on top of the hero and band photos (with a dark overlay), so calm photos with space around the subject work best.
- If faces get cut off in the hero, adjust `images.heroPosition` (e.g. `"50% 20%"`).
- Set `story` or `quote` to `null` to hide that whole section.

## 2. Where RSVPs go

Responses are saved by the same Apps Script as the guest list (`guestLookupUrl`), into your Google Sheet:

- **`Respuestas` tab** (created automatically): `Codigo | Nombre | Asiste | PlusOne | Nombre +1 | Actualizado`.
  One row per guest; if someone changes their answer, their row is updated, not duplicated.
- **`Respuesta` column in `Invitados`** (added automatically): `Sí`, `Sí (+1)` or `No`. Empty = hasn't answered yet.
- For coded guests the name and +1 permission come from the Sheet, so a guest can't change them.
- If saving fails (no connection), the guest sees an error and can retry — no false "confirmed".

Until `guestLookupUrl` is set, the page runs in **demo mode** (nothing saved, payload logged to the console).
The `googleForm` block in `config.js` is a legacy alternative, used only when `guestLookupUrl` is empty.

## 3. Guest list (private, in Google Sheets)

The guest list lives only in your Google Sheet. The page asks a small Apps Script for **one** guest by code;
the full list never reaches the browser. Edits in the Sheet apply instantly — no redeploy.

**Sheet** — a tab named `Invitados` with headers in row 1:

| A: Codigo | B: Nombre | C: PlusOne (checkbox) | D: Sobre (optional) | E: Link (optional) |
|---|---|---|---|---|
| a3f9c | John Doe | ☑ | | `="https://your-site.netlify.app/?g="&A2` |
| 34aef | Kaladin Stormblessed | ☐ | | … |
| f4m11 | Paul Atraides | ☐ | Familia Atraides | … |

- **Sobre** (optional column, any position): text for the envelope. Empty → the full `Nombre`.
- **Couples & families**: if the name (or Sobre) contains " y " / " & " or starts with "Familia", the page switches
  to plural ("los invitamos", "¿Nos acompañan?", "Su asistencia…"). Usually leave PlusOne unchecked for these.

Codes: `=LOWER(DEC2HEX(RANDBETWEEN(65536; 1048575)))` (Spanish locale uses `;`), then
copy → Paste special → **Values only** so they stop changing. Codes are case-insensitive.

**Connect it (one time, ~5 min)** — Google menus shown in Spanish / English:

1. In the Sheet: **Extensiones → Apps Script** (Extensions → Apps Script).
2. Delete the sample code, paste the contents of `apps-script/Code.gs`, click 💾 Save.
3. *(Optional test)* In the function dropdown pick `testLookup` (or `testRsvp` — it writes a test answer for the first guest) → **▶ Ejecutar** (Run).
   Approve permissions: choose your account → **Configuración avanzada** (Advanced) →
   **Ir a … (no seguro)** (Go to … unsafe) → **Permitir** (Allow). That warning is normal for your own script.
   The log should show the first guest as JSON.
4. **Implementar → Nueva implementación** (Deploy → New deployment) → ⚙ type **Aplicación web** (Web app):
   - Ejecutar como (Execute as): **Yo** (Me)
   - Quién tiene acceso (Who has access): **Cualquier usuario** (Anyone)
   → **Implementar** (Deploy) → copy the **URL de la aplicación web** (ends in `/exec`).
5. Paste it into **`config.local.js`** → `guestLookupUrl` (copy `config.local.example.js` if you don't have it).
   This file is git-ignored; on GitHub Pages the URL comes from the `GUEST_LOOKUP_URL` secret (see Deploy).
6. Check: open `<that URL>?g=a3f9c` in a browser → you should see `{"found":true,"name":"Billi Ramírez","plusOne":true}`.

If you later **change the script code**: Implementar → Gestionar implementaciones → ✏️ → Versión: **Nueva versión**
(the URL stays the same). Editing the Sheet itself never needs this.

**Behavior**
- `?g=CODE` found → personalized invitation; +1 toggle only if PlusOne is checked.
- Unknown code, or Google unreachable → generic invitation that asks for the guest's name.
- `?guest=Name` links still work (+1 per `defaultAllowPlusOne`).
- While `guestLookupUrl` is empty, the local `guests` list in `config.js` is used (handy for testing).

## 4. Run locally

```bash
npx serve .        # or: python3 -m http.server
```

Open `http://localhost:3000/?g=m4r1` in mobile view. To reset a test RSVP, use "Cambiar mi respuesta"
(the answer is remembered per device in localStorage).

## 5. Deploy (GitHub Pages)

The Apps Script URL never goes into the repo:

| Where | URL comes from |
|---|---|
| Your machine | `config.local.js` (git-ignored) |
| GitHub Pages | repo secret `GUEST_LOOKUP_URL` → the workflow writes `config.local.js` at deploy time |

One-time setup:
1. Push the repo to GitHub (branch `main`).
2. **Settings → Secrets and variables → Actions → New repository secret**:
   name `GUEST_LOOKUP_URL`, value = your `/exec` URL.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Every push to `main` deploys (`.github/workflows/deploy.yml`). Run it manually from the **Actions** tab too.
   The site is at `https://<user>.github.io/<repo>/` — use that in your guest-link formula.

Only the site files are published (`index.html`, `styles.css`, `main.js`, `config.js`, `assets/`,
plus the generated `config.local.js`) — not `README.md` or `apps-script/`.

Note: the browser still has to call the URL, so it is visible in the live site's network requests. The secret
keeps it out of your code and git history; the script itself only ever reveals one guest per valid code.

## Animation notes

- Envelope → letter → hero intro is one GSAP timeline (`openEnvelope` in `main.js`).
- Guest name uses SplitText; sections use ScrollTrigger (`.reveal` class).
- Hero photo: slow zoom-in on open + parallax on scroll. Quote band: scrubbed parallax. Gallery and card photos animate in on scroll.
- Don't add `scroll-behavior: smooth` to CSS — it breaks ScrollTrigger; smooth anchor scrolling is done in JS.
- `prefers-reduced-motion` gets simple fades only. If the GSAP CDN fails, the page shows without animation.
