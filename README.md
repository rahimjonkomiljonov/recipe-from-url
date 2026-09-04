# Recipe Manager

Paste a URL — a recipe website, a YouTube video, or an Instagram post — and auto-extract the recipe into a personal saved collection.

## How it extracts

- **Recipe websites**: parses the schema.org `Recipe` data most sites embed as JSON-LD (with a Microdata/heuristic HTML fallback for sites that don't). No API key needed.
- **YouTube**: pulls the video description and sends it to Gemini to extract structured ingredients/instructions.
- **Instagram**: best-effort fetch of the public post caption (no login), also sent to Gemini. Instagram often blocks anonymous fetches — when it does, you can paste the caption yourself.

## Setup

```bash
npm install
cp .env.example .env
```

Add a free-tier Gemini API key to `.env` (get one at [Google AI Studio](https://aistudio.google.com/app/apikey)):

```
GEMINI_API_KEY=your-key-here
```

This is only required for YouTube/Instagram extraction — recipe-website extraction works without it.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Other commands

```bash
npm run build   # compile client + server to dist/
npm start       # run the compiled server (after npm run build)
npm test        # run unit tests (no network or API key needed)
```

Saved recipes live in `data/recipes.sqlite` — delete that file to reset your collection.
