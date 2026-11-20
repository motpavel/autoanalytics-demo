# AutoAnalytics — demonstration on GitHub Pages

Responsive analytics dashboard and conversational AI analyst for a saved 1C export snapshot, May–June 2026.

## Hosting

- The browser interface is published to **GitHub Pages** by `.github/workflows/pages.yml`.
- The assistant runs on **Vercel Functions**, using GPT‑6.1 Terra through OpenAI Responses API.
- The same anonymized snapshot is used by charts and server-side calculations.

GitHub repository variable `VITE_API_BASE_URL` sets the public API origin at build time. It is an address, never an API key. Vite uses relative asset URLs so project Pages paths work.

## Demo data

The public snapshot replaces personal names, VINs and order numbers with demonstration identifiers. Counts, amounts, dates, groupings and sales/service relationships are retained. Original Excel exports and original personal identifiers are not included.

This snapshot contains 198 sales and 833 service orders. It does not contain a lead funnel or evidence about vehicle reliability. The assistant distinguishes facts from hypotheses and asks clarifying questions when a request is ambiguous.

## Assistant access

The dashboard is public. The assistant requires a demonstration invitation or access code. An invitation's fragment is exchanged for a signed session and removed from the address bar. Session validity is seven days. Changing `DEMO_ACCESS_CODE` invalidates existing sessions. The code and OpenAI key are never committed or included in the frontend bundle.

The server allows the exact configured frontend origins, validates requests, and bounds concurrent calls and per-instance request frequency. The invitation can be shared with demonstration attendees; OpenAI usage is charged to the owner's API project.

## Server settings

Configure these only in Vercel's production environment:

- `OPENAI_API_KEY`: server-side Secret.
- `OPENAI_MODEL=gpt-6.1-terra`.
- `DEMO_ACCESS_CODE`: private demonstration code.
- `ALLOWED_ORIGINS=https://motpavel.github.io`.
- `AI_MODE=api`.

Do not add provider credentials to `VITE_*`, GitHub Pages, or source files.

## Local development and verification

Node.js 24 is required.

```sh
npm ci
npm test
npm run build
npm run dev
```

Local server: `http://127.0.0.1:5182`. Set server variables in ignored `.env.local` when running the live assistant locally. Without provider access the dashboard still works; mock mode is explicit and never silently replaces provider errors.

To test an already deployed assistant, set `DEMO_URL` and `DEMO_ACCESS_CODE`, then run `npm run test:live`.
