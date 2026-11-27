# Puddle Farm frontend

Next.js App Router serves the interface with the Rust backend. The frontend runs
at `/`, and browser API requests use `/api`.

## Development

```sh
npm ci
GGST_API_INTERNAL_URL=http://127.0.0.1:8001 npm start
```

Open http://localhost:3000. The development server proxies `/api` to Rust.
Server-side API requests use `GGST_API_INTERNAL_URL` with the `/api` prefix.
`NEXT_PUBLIC_GGST_API_ENDPOINT` configures the browser API URL at build time.

## Language and design

Settings saves English, Korean, or Japanese and Classic or Ladder using cookies.
Without a language cookie, the server reads Accept-Language and selects Korean
or Japanese when supported, otherwise English. A saved language takes precedence.
Ladder is the default design. Settings also controls the Classic character
palette and the Ladder theme, which defaults to the device's color scheme.

## Verification

All tests live in `tests/`. Unit/component tests in `tests/unit/` mirror `src/`
and use Jest through `next/jest`; shared Jest setup lives in `tests/setup/`.
Integration runners, API fixtures, and Chrome/server helpers live in
`tests/integration/`; they inspect production HTML and browser behavior,
including native forms and JavaScript-disabled pages.

```sh
npm run typecheck
npm run check
npm test
npm run build
npm run test:ssr
npm run test:browser  # Requires local Chrome; CHROME_BIN selects the binary.
```

## Production

```sh
npm run build
npm run preview
```

The nginx example routes `/api` to Rust and pages/assets to Next.js on port 3000.
Set `GGST_SITE_URL` to the frontend's public origin to use it in link previews.
Standalone output is available in `.next/standalone`; copy `public` and
`.next/static` alongside the generated server when deploying that artifact.
`/health` reports process health without API calls or page rendering.
Next.js supplies response security headers and streamed SSR responses.

Pages fetch initial data on the server. Chart controls, search/navigation, match
expansion, and settings use focused client components. Theme and display cookies
seed SSR preferences, including local time/time zone, rating colors, and
auto-update. Browser initialization imports localStorage preferences when their
cookies are absent. Builds do not contact the backend.
