# DevHub Web

Frontend for DevHub (chat, meetings, calendar): Next.js 16 (App Router), React 19, Redux Toolkit +
RTK Query, Tailwind CSS v4, Framer Motion, Socket.IO client. It needs the **devhub-api** repo
running.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev                       # http(s)://HOST_IP:WEB_PORT
```

Start devhub-api first.

**Local address.** `HOST_IP` (`localhost` or this machine's LAN IP), `WEB_PORT` and `HTTPS` must
match devhub-api's `.env`. `npm run dev` prints the URLs to open.

- The browser's socket connects to this app's own origin. Next forwards `/socket.io` (websockets
  included) to the API, so other devices only need `WEB_PORT`. Allow it through the OS firewall.
- **HTTPS (camera and mic on other devices).** Browsers only allow camera, mic, clipboard and
  notifications on HTTPS or localhost. With a LAN `HOST_IP`, `npm run dev` serves
  `https://HOST_IP:WEB_PORT` using a certificate from Next's built-in mkcert helper, saved in
  `certificates/`. The first run installs mkcert's local CA on this machine, and Windows may ask
  to confirm. Other devices show a certificate warning once: choose "Advanced → Proceed", or
  install `rootCA.pem` (path printed at startup) on the device. Set `HTTPS=false` to turn it off.

## Folder structure

```
src
  app/            Next.js routes (route groups for the authed dashboard shell); api/[...path] = API gateway
  features/<name>/ RTK Query API slice + Redux slice + hooks + components, per feature
  common/
    components/   shared UI (Button, Input, Avatar, Sidebar, Topbar, StatusDot...)
    rbac/         usePermission/useCan hooks + <Can> gate — the one place permission checks happen
    lib/          cn(), deviceId, clipboard, socket client singleton
    providers/    RealtimeProvider (the one place the socket is opened and fanned into the store)
  shared/         types + constants shared with devhub-api (see below)
  store/          Redux store, RTK Query base (401 -> refresh -> retry), response unwrapping
```

## Shared code (`src/shared`)

Socket event names, roles/permissions, API response types and meeting types, imported as
`@devhub/shared-types` (a `tsconfig.json` path alias). devhub-api has an identical copy in its
`src/shared`. **When you change a file here, copy it to devhub-api too**, or the two ends drift
apart. The only difference between the copies: the API's imports use `.js` suffixes, these don't.

## How it talks to the API

- **REST and Socket.IO:** the browser calls the API directly at `NEXT_PUBLIC_API_URL` (default
  `http://localhost:API_PORT`). The API lets this app's origin through CORS (`CLIENT_ORIGIN`).
- **Auth:** the access token stays in memory (Redux), and the refresh token is an `httpOnly`
  cookie. A 401 triggers one refresh and a retry (`store/apiBase.ts`).
- **Permissions** arrive from the API on login / `/auth/me`. Every check goes through
  `common/rbac/usePermission.ts` or `<Can>`. The UI never computes permissions from a role name.
- **Meetings** are peer-to-peer WebRTC (`features/meetings/rtc/`), with low-data modes in
  `quality.ts`. A dock keeps a call going while you browse, and incoming calls ring on any page.

## Deploying on Vercel

1. Import this repo on Vercel. Framework preset: Next.js. No root directory or custom commands
   needed.
2. Environment variables:

   | Variable              | Value                                                                                                            |
   | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL` | the API's public URL, e.g. `https://devhub-api.up.railway.app`                                                   |
   | `NEXT_PUBLIC_WS_URL`  | optional; only if Socket.IO lives at a different URL than the API                                                |

3. Deploy, then set the Vercel URL as `CLIENT_ORIGIN` on the API.

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are baked in at build time, so redeploy after changing it. `HOST_IP`,
`API_PORT`, `WEB_PORT` and `HTTPS` are local-only.

## Known gaps

- Whiteboard is a nav placeholder only.
- `typescript-eslint` doesn't support TypeScript 7 yet, so ESLint only covers JS files.
  `npm run typecheck` is the correctness check.
- No automated tests yet.
