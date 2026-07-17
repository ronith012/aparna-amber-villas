# Aparna Amber Villas — Scroll Walkthrough

A scroll-driven video walkthrough for Aparna Amber Villas (Hyderabad), built around a 4K real-estate concept film. As the visitor scrolls, the background video scrubs frame-by-frame in sync — the page becomes a continuous, cinematic tour of the property instead of a series of static sections.

**Live site:** https://aparna-amber-villas.vercel.app

## How it works

- A tall scroll track (`#scroll-track`, `1800vh`) holds a `position: sticky` video stage pinned to the viewport. Scroll position maps linearly to a target point in the video's timeline.
- [Lenis](https://github.com/darkroomengineering/lenis) intercepts wheel/touch input and eases it into the real scroll position, so input feels damped and deliberate rather than jumping in raw, coarse deltas.
- A render loop lerps the video's `currentTime` toward the scroll-derived target every frame, only issuing a new seek once the previous one resolves (`!video.seeking`) — seeking faster than the browser can service silently stalls `currentTime` otherwise.
- Eight timed phases (see below) fade in contextual captions — eyebrow label, heading, and supporting line — synced to what's on screen at that point in the video.
- A loading screen tracks the video's real buffered range against its duration (not a fixed set of steps) and clears once enough is buffered to start scrubbing smoothly.

## Video

The background film was cut down from a longer 4K source: branding/credit interstitials (logo cards, architect/vendor credits, the closing black frame) were removed, one overlong static hold was trimmed to match the pacing of its neighbors, and a redundant duplicate cutaway was cut entirely. Final runtime is **154s**.

Two encodes are served via responsive `<source>` tags:

| File | Resolution | Used when |
|---|---|---|
| `media/walkthrough.mp4` | 1600px wide, ~96MB | viewport ≥ 800px |
| `media/walkthrough-mobile.mp4` | 960px wide, ~32MB | viewport < 800px |

Both are H.264 with a keyframe every 24 frames (1s) for responsive scrubbing, `+faststart` for quick initial load, and no audio track.

**Hosting requirement:** the host must support HTTP Range requests (`Accept-Ranges: bytes`, `206 Partial Content`) — this is how the browser seeks into the video. Netlify, Vercel, Cloudflare Pages, GitHub Pages, and any standard nginx/Apache setup all support this by default. A bare Python `http.server` does not, and video seeking will silently fail if you use one for local testing.

## Phases

| Phase | Timestamp | Caption |
|---|---|---|
| Hero | 0–22s | "Enter a world of vibrant colors and endless calm." |
| Arrival | 22–46s | "A grand welcome, wrapped in bloom." |
| The Avenues | 46–57s | "Streets framed in purple bloom." |
| Recreation | 57–85s | "Spaces that move with you." |
| Leisure | 85–103s | "Slow mornings. Quiet evenings." |
| The Oasis | 103–145s | "An oasis at the heart of it all." |
| Nightfall | 145–149s | "Home, after the light softens." |
| The Masterplan | 149–154s | "Thoughtfully planned, down to the last detail." |

Phase boundaries and copy live in the `phases` array in `script.js` — reordering, retiming, or rewriting a phase only requires editing that array (captions, phase dots, and progress mapping all derive from it).

Captions are bottom-anchored at every screen size on purpose: the video's own baked-in intro title text sits vertically centered in frame, so captions stay clear of that band rather than competing with it.

## File structure

```
aparna-amber-villas/
├── index.html          Page shell, video element, caption/progress containers
├── styles.css           All styling — layout, captions, loader, finale section
├── script.js            Scroll↔video sync, Lenis setup, caption/phase logic, loader
├── vendor/
│   └── lenis.min.js      Vendored locally (no external CDN dependency)
└── media/
    ├── walkthrough.mp4          Desktop video
    ├── walkthrough-mobile.mp4   Mobile video
    └── poster.jpg               First-paint poster frame
```

No build step, no dependencies to install — it's plain HTML/CSS/JS.

## Local development

Video seeking needs a server that supports Range requests, so you can't just open `index.html` as a `file://` URL or use a bare `python -m http.server`. Use any of:

```bash
npx http-server . -p 4173

# or
npx serve .
```

Then visit `http://localhost:4173`.

## Deployment

Currently deployed to Vercel via the CLI (not git-integrated — no auto-deploy on push):

```bash
npx vercel --prod
```

Run this from inside `aparna-amber-villas/` after any change you want to ship.

## Tuning the feel

All in `script.js`:

- **Scroll speed** — `wheelMultiplier` / `touchMultiplier` in the `Lenis` config control how far a given scroll gesture moves the video; `duration` controls how long it takes to ease to a stop.
- **Seek smoothness** — the `0.12` lerp factor in `render()` controls how eagerly `currentTime` chases the scroll target; lower is smoother but laggier.
- **Scroll track length** — `--track-vh` in `styles.css` sets the total scrollable distance for the whole video; longer means slower perceived pacing for the same footage.
