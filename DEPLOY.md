# Deploying Aria

The app is a **single Next.js application** at the repo root: frontend (landing + match page) and the `/api/transform` API route run together.

## Quick deploy (Vercel)

1. **Push your code** to GitHub (or connect another Git provider).

2. **Import the project** in [Vercel](https://vercel.com):
   - **Root Directory:** leave as `.` (repo root).
   - **Framework Preset:** Next.js.
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** leave default (Next.js sets this).

3. **Environment variables** (Project → Settings → Environment variables). Set these for **Production** (and Preview if you want):

   | Variable               | Required | Description |
   |------------------------|----------|-------------|
   | `ELEVENLABS_API_KEY`   | Yes      | ElevenLabs API key for voice synthesis. |
   | `GEMINI_API_KEY`       | Yes      | Google Gemini API key for transcription. |

   - **Optional:** `NEXT_PUBLIC_API_URL` — only if you run the frontend and API on different origins (e.g. API on another domain). For a single Vercel deploy, leave it unset so the app uses the same origin for `/api/transform`.

4. **Deploy.** Vercel will run `npm run build` and serve the app. Your site will be at `https://<project>.vercel.app` (or your custom domain).

---

## Other platforms

- **Netlify:** Use the [Next.js runtime](https://docs.netlify.com/frameworks/next-js/). Root = `.`, build = `npm run build`. Add `ELEVENLABS_API_KEY` and `GEMINI_API_KEY` in Site settings → Environment variables.
- **Railway / Render / Fly.io:** Use a Node server. Set **Build** to `npm install && npm run build` and **Start** to `npm run start`. Expose the port Next.js uses (default 3000). Add the two env vars above.
- **Docker:** Use the official [Next.js Docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker) and add the env vars to the container.

---

## Local production check

Before deploying, run a production build locally:

```bash
npm install
npm run build
npm run start
```

Open `http://localhost:3000`, try the landing page and `/match` (record → transform). If that works, the same build will work on Vercel (or your host) once the API keys are set.
