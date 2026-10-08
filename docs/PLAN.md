# LanaTools Mobile: plan

An Android-only app for the Solana Seeker. The user signs in with Privy (the
same Privy app as LanaTools), gets their LanaTools embedded wallet, and chats
with an agent that uses the tools of the **production LanaTools MCP server**
(`https://mcp.lanatools.sh/mcp`). The agent runs on Flue and defines no tools
of its own: every tool comes from the remote MCP server. The app performs the
MCP sign-in and shares the resulting access token with the agent.

Status: main decisions settled on 2026-10-08 (see "Decisions"). Nothing is built yet.

## Sources

| Source                                  | Used for                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `../lanatools`                          | Brand and design tokens, MCP server, OAuth and consent, Privy app, tool list                                                   |
| `../mobile`                             | **Technical reference only:** Privy on Expo/Android, polyfills, MWA sign-in, Flue server and client. Its design is not reused. |
| Flue 2.2.x (withastro/flue, Apache-2.0) | Agent runtime: `useModel`, `useMcpConnection`, durable conversations. No `defineTool`.                                         |

## Architecture

```
┌──────────── Seeker (Android) ─────────────┐  in-app consent:      ┌─ LanaTools prod ─────────────┐
│ apps/mobile  (Expo SDK 57, RN 0.86)       │  Privy token + PKCE   │ mcp.lanatools.sh             │
│  Privy Expo SDK ─ embedded Solana wallet  ├──────────────────────►│  /first-party/authorize (new)│
│  MWA (Seed Vault) ─ wallet sign-in only   │  ◄── { code } ──────  │  /token (+ refresh)          │
│  MCP tokens in SecureStore (refresh stays │                       │  /mcp  (all the tools)       │
│    on the phone)                          │                       └──────────▲───────────────────┘
│  @flue/sdk client ─ chat stream           │                                  │
└───────┬───────────────────────────────────┘                                  │
        │ Authorization: Bearer <Privy token>                                  │
        │ X-LanaTools-Token: <MCP access token>                                │
        ▼                                                                      │
┌──────────────── apps/agent (Flue, Cloudflare) ───┐                           │
│ Hono middleware: verify Privy JWT, check          │                          │
│   conversation ownership, save MCP access token   │    Bearer <MCP token>    │
│   (D1, encrypted, expires with the token)         ├──────────────────────────┘
│ Agent: Claude + useMcpConnection('lanatools')     │
│   no tools of its own                             │
└───────────────────────────────────────────────────┘
```

### Key decisions

1. **Production MCP only, and no tools of our own.** The agent connects to
   `https://mcp.lanatools.sh/mcp` with `useMcpConnection` and gets every tool
   from there. Nothing is reimplemented in Flue. When LanaTools adds a tool,
   the agent has it on its next message.
2. **Consent happens inside the app, with the Privy session the user
   already has.** No browser and no second sign-in. This needs one small
   LanaTools change; see "LanaTools change" below.
   - "LanaTools Mobile" is registered once against production as a public
     OAuth client (PKCE, no secret). Its `client_id` ships in the app's
     configuration. Each user gets one "LanaTools Mobile" entry in their
     dashboard, with its own limit and revoke button, like any other client.
   - The app shows a native consent screen, a port of the web consent card:
     tool families and a spending limit.
   - On "Connect", the app sends the OAuth parameters (PKCE challenge, state,
     resource), the user's choices and the Privy access token to the new
     first-party endpoint. It gets back an authorization code and exchanges
     it at `/token` as usual.
   - From then on everything is standard: access and refresh tokens,
     rotation, revocation from the dashboard, and the same grant and limit
     checks on every call.
3. **The app shares the access token with the agent, never the refresh
   token.**
   - Before each message, the app refreshes the access token if it expires
     within five minutes. It then sends the token in an `X-LanaTools-Token`
     header alongside the Privy token.
   - The agent's middleware saves it in D1, encrypted and expiring with the
     token, keyed by the Privy user. The MCP `auth` callback reads it from
     there.
   - The agent never stores a credential that outlives an access token.
4. **Transactions are signed on the phone, never by the agent.** LanaTools
   cannot sign swaps on the server; its signer policy allows only USDC
   payments. When an MCP tool returns an unsigned transaction (today
   `jupiter_build_swap`), the app decodes it and shows what it does. The user
   then signs with the Privy embedded wallet.
5. **The production Privy app.** MCP grants belong to Privy users of
   LanaTools' production app, so the mobile app must sign in to that same app.
   It needs a new Privy **App Client** for Android, with the package name, the
   signing-certificate SHA-256 and the `lanatools` scheme. The embedded wallet
   is the one the lanatools.sh dashboard shows.

## LanaTools change: first-party consent

The web consent flow cannot run natively as it stands. `POST /consent` is
bound to the browser that opened `/authorize`: it needs a `__Host-` cookie set
by `beginConsent` in `@cloudflare/workers-oauth-provider` 1.1.0, and an
`Origin` equal to `mcp.lanatools.sh`. Faking both from the app would be
brittle. Instead, add a narrow endpoint to `apps/mcp` in the lanatools repo:

```
POST https://mcp.lanatools.sh/first-party/authorize
Authorization: Bearer <Privy access token>
{ client_id, redirect_uri, code_challenge, code_challenge_method: "S256",
  state, resource, decision: "approve" | "deny", scopes: ToolScope[], limitUsd? }
→ 200 { code, state } | 4xx { error }
```

- **Allowlist.** It accepts only `client_id`s in a `FIRST_PARTY_CLIENT_IDS`
  variable, which today is just LanaTools Mobile. Every third-party client
  still goes through the web consent page.
- **Validation.**
  - The OAuth parameters go through the same `parseAuthRequest` checks as
    `/authorize`.
  - `redirect_uri` must exactly match the registered one.
  - Only S256 PKCE is accepted.
- **Reuse.** It runs the same steps as the web approval: `verifyPrivyToken`,
  then `prepareGrant`, `completeAuthorization` and `activateGrant`, with the
  same scope and limit validation (`grantScopes`, `parseClientLimit`, the
  limit required for `payments:pay`).
- **Response.** It returns the code in the response body instead of
  redirecting, so no other Android app can intercept a `lanatools://`
  redirect.
- **Trust boundary.** A Privy access token can already change a client's
  limit through `PUT /api/mcp/clients/:id/limit`. This endpoint lets it
  create a grant only for the app's own client, and only after the user
  taps Connect in the app.
- **Tests.**
  - Unknown or third-party `client_id`: refused.
  - Bad PKCE: refused.
  - Payments without a limit: refused.
  - Forged Privy token: refused.
  - A deny issues no grant.
  - Revoking in the dashboard makes the next refresh fail.
- The library accepts a custom-scheme `redirect_uri`; it rejects only
  `javascript:`, `data:`, `file:` and similar. So `lanatools://oauth/callback`
  can be registered even though nothing is ever redirected to it.

This ships as its own PR and production deploy in the lanatools repo before
milestone 4.

## Repository layout

npm workspaces. Bun is not installed on this machine; the reference app proves
npm, Expo 57 and Privy work together, and Flue requires Node ≥ 22.19.

```
lanatools-mobile/
  apps/mobile/        Expo app (dev client; Expo Go cannot load Privy's native modules)
  apps/agent/         Flue server (Hono + Flue agent)
  packages/protocol/  Shared types: conversation ids, header names, tool-part shapes the app renders
  docs/               PLAN.md, DESIGN.md, AUTH.md
  .github/workflows/  checks: format, lint, typecheck, test
```

## Design system (from LanaTools, not from `../mobile`)

Every screen, the welcome screen included, uses the **dashboard and sign-in
look** (`.dash` in `lanatools/apps/web/src/styles.css`). The landing page's
blue poster look is not used: **no blue backgrounds**.

- **Page background.** The dashboard surface, with its scattered "side field"
  pattern on top (`components/dashboard/side-field.tsx`). The field holds
  faint line icons: agent, block, coin, receipt, key, wallet, chart, the
  Solana mark and USDC coins. A few are joined by dotted links, like a small
  network.
  - Light: paper `#f3efe6` background, marks in `#d3c9b4`.
  - Dark: `#08090c` background, marks in `#262a32`.
  - About 12% of the marks take the accent colour: translucent blue in light,
    translucent lime in dark.
- **Surfaces.**
  - Cards: panel `#fffdf8` / `#0f1115`, 1px hairline borders, radius 10.
  - Hero frames: dashed, with diagonal hatching.
  - Card and table headers: hatched.
- **Type.** Paper Mono for labels, numbers, buttons and addresses. Inter Tight
  for sentences.
- **Theme.** Follows the system, with a manual toggle.
- **Header and status bar.** The header is the dashboard's: wordmark, nav,
  theme toggle and account pill. The thin status bar at the bottom carries
  messages like "● Secure access" and "◎ Built on Solana".
  - In light theme the dashboard header is a blue bar. Following the no-blue
    rule, the app uses the panel colour with a hairline underneath, the same
    as dark theme. Blue stays an accent only: primary buttons in light theme,
    the active nav underline, checkboxes, ticks.

**The side field on a phone.** On the web, the field fills only the margins
beside the 1100px content column, and it draws nothing when a margin is
narrower than 110px, which is every phone. The app adapts it:

- **Welcome, sign-in and consent screens:** the field covers the whole
  screen. It fades out behind the centred card with a radial or vertical
  mask, which on the web is a horizontal fade toward the column.
- **Chat:** the field stays only above the first message and in the empty
  state, so long conversations stay readable.
- **Same pattern every time:** it uses the same seeded scatter (the LCG
  seeds and 80px cells) as the web.
- **Drawing:** it is drawn with `react-native-svg`, measured once per screen
  size and memoised.

The light and dark token tables, radii, type scale and motion eases are ported
from `lanatools/apps/web/src/styles.css` into `apps/mobile/src/theme/`.

Rules carried over:

- Lime means money that moved, or the primary action. Coral means a refusal.
  Neither is decoration.
- One focal point per screen.
- Labels are uppercase mono at 11px with 0.06em letter-spacing.
- Copy uses sentence case with no exclamation marks. In-progress labels end
  in "…".
- Brand name: "LanaTools" in prose, lowercase `lanatools` in the wordmark.

How each piece of the brand gets into the app:

| Asset                                                | Source                                                                                                | Into the app                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Paper Mono font (OFL)                                | `lanatools/apps/web/src/fonts/paper-mono-variable.woff2`                                              | TTF via `expo-font`                                                                                  |
| Inter Tight font                                     | Google Fonts                                                                                          | `@expo-google-fonts/inter-tight`                                                                     |
| Logo mark ("open port" shape, prompt and lime caret) | `brand.tsx` paths                                                                                     | `react-native-svg` component, animated with Reanimated                                               |
| Side-field pattern                                   | `side-field.tsx` (icon paths, seeded scatter, dotted links) and the `--d-pat` / `--d-pat-acc` colours | `SideField` component on `react-native-svg`, full-screen with a fade mask                            |
| App icon                                             | `favicon.svg`                                                                                         | Android adaptive icon. It is a launcher icon, not a background, so it keeps LanaTools' brand square. |
| Hatching                                             | CSS pattern                                                                                           | SVG `<Pattern>`: 135° lines, 1px every 7px                                                           |
| Rolling number counter                               | `animated-counter.tsx`                                                                                | Reanimated port, for balances                                                                        |

Library choices:

- Icons: `phosphor-react-native` for the few icons LanaTools uses, plus Unicode
  glyphs (`→ ↗ ☾ ☀ ●`).
- Styling: plain `StyleSheet` plus a small theme context
  (`src/theme`). Two palettes and a toggle don't need a styling library, and
  this keeps native dependencies down.
- Fonts are embedded at build time by the `expo-font` config plugin, as Android
  font families with static weights (Paper Mono 400–700, Inter Tight 400–600).
  The first frame is already in the brand's type, and nothing flashes while
  fonts load.
- Respect the system's reduced-motion setting everywhere.

## Screens

The app is a native mobile app, not a website on a phone: an app bar, sheets,
a composer above the keyboard, thumb-reach controls, haptics. LanaTools'
palette, type, side-field pattern and hatching carry the brand; the web's
page chrome (hero cards, footer status bar, back pills) does not.

**Chat comes first.** The app opens into a chat, and nothing asks for a
wallet until the user tries to use the agent.

1. **Chat**, the home screen.
   - **App bar:**
     - The mark, the conversation title, and a **Connect** button while
       signed out.
     - Once signed in, the button becomes the wallet chip, which opens the
       account sheet.
   - **Empty state, on the side-field pattern:**
     - The mark, "What should your agent do?", one sentence.
     - Suggestion cards just above the composer, one per tool family:
       Helius, Jupiter, Phoenix, pay.sh.
   - **Composer:** pinned above the keyboard (`react-native-keyboard-
controller`). The send button is filled only once there is text.
   - **Signed out:** sending, or tapping a suggestion, opens the sign-in
     sheet. The message stays in the composer and sends after sign-in.
   - **Messages** (milestone 5):
     - Sentences in Inter Tight.
     - Tool calls as cards with a hatched header: tool and provider, a status
       dot, and a collapsible result.
     - Paid calls show the cost in lime.
     - A stop button while the agent works.
2. **Sign-in sheet**, the web sign-in card as a bottom sheet.
   - A hatched header with the mark.
   - "Connect your wallet".
   - Continue with Google, then **Seeker wallet** (MWA sign-in).
   - Footnote: "A wallet sign-in verifies ownership with a message. No funds
     move."
   - Drag down, tap the scrim, or use back to close.
3. **Connect LanaTools sheet** (milestone 4): the native consent card.
   - Signed-in identity.
   - Helius, Jupiter, Phoenix and Pay, all ticked by default.
   - Spending limit.
   - Connect.
   - Opens the first time the agent needs LanaTools.
4. **Transaction sheet** (milestone 6).
   - Opens when a tool result holds an unsigned transaction.
   - Shows what the app itself decoded: network, amounts, fee, expiry.
   - Buttons: **Sign and send**, or Decline.
5. **Account sheet.**
   - Embedded wallet address and balance, with copy.
   - Sign-in method.
   - Theme: system, light or dark.
   - LanaTools connection and a link to the dashboard.
   - Disconnect and sign out.
6. **Conversations drawer** (milestone 5): past chats, and new chat.

## Auth and security

- **App to agent.**
  - Every request carries `Authorization: Bearer <Privy access token>`. The
    `@flue/sdk` `headers` callback runs on every request and every reconnect,
    so tokens refresh on their own.
  - The agent verifies the token with `jose` (ES256, issuer `privy.io`,
    audience = app ID) using Privy's verification key. It does not need the
    Privy app secret.
- **Conversation ownership.**
  - The server issues conversation ids of the form
    `<hash(privyUserId)>.<uuid>`. Privy ids contain colons, so the user part
    is hashed.
  - Middleware rejects any `/agents/*` request whose id does not start with
    the caller's hash.
  - This fixes the open routes in `../mobile`.
- **App to LanaTools (OAuth with in-app consent).**
  - One public client, registered once by DCR against production, with
    redirect `lanatools://oauth/callback`. The redirect is required by OAuth
    but never used, because the code comes back in the response body.
  - The app generates the PKCE verifier and `state`, then calls
    `POST /first-party/authorize` with the Privy access token and the user's
    choices.
  - It checks that the returned `state` matches, then exchanges the code at
    `/token`.
  - Access and refresh tokens are kept in `expo-secure-store`. The app
    refreshes them itself; refresh tokens rotate.
  - If a refresh returns `invalid_grant`, the grant was revoked or the
    client was disconnected in the dashboard. The app clears the tokens and
    shows the consent card again.
- **App to agent (sharing the token).**
  - The `@flue/sdk` `headers` callback adds `X-LanaTools-Token` to each
    request.
  - The middleware writes the token to D1, encrypted with AES-GCM, keyed by
    the user hash, and deletes it when it expires.
  - A missing token means the agent runs without LanaTools
    (`optional: true`). The model is told that LanaTools isn't connected,
    and the app shows the connect banner.
- **Agent to LanaTools.**
  - `useMcpConnection({ name: 'lanatools', url: 'https://mcp.lanatools.sh/mcp',
auth: () => tokens.get(userHash), optional: true })`.
  - No `tools` allowlist: the user's grant already limits what `tools/list`
    returns.
  - The user hash comes from the conversation id, which the middleware
    guarantees.
  - A 401 during a turn shows up as a tool error. The app refreshes the
    token before the next message.
- **Signatures, without agent-side tools.**
  - The app watches for `dynamic-tool` parts named
    `mcp__lanatools__jupiter_build_swap` with `output-available`. It reads
    `transaction` (base64 v0, unsigned) from the structured output.
  - The app checks that the fee payer is the user's embedded wallet, and that
    the transaction hasn't passed `lastValidBlockHeight` or `expireAt`.
  - If `router === 'jupiterz'`, it submits through Jupiter's execute
    endpoint with the `requestId`.
  - The agent's instructions say: after building a transaction, stop and ask
    the user to review it in the app. Never claim it was sent.
  - After signing, the app sends a follow-up message with the signature, or a
    decline, so the agent can continue.
  - New LanaTools transaction tools (for example `solana_transfer` on an
    unmerged branch) get a renderer in the app. Nothing changes in the agent.
  - Privy's Expo provider accepts only `@solana/web3.js` v1
    `VersionedTransaction` objects. Use web3.js for signing and
    `@solana/kit` everywhere else.
- **Secrets.** No secret ever goes in an `EXPO_PUBLIC_*` variable.

## Networks

- **Production only.** The app, the production Privy app and
  `mcp.lanatools.sh` all run on Solana mainnet. Paid `call` tools spend real
  USDC within the limit the user approved. Swaps the user signs move real
  funds.
- Development builds use production too, so test with a separate Google
  account and a wallet holding a few dollars. Use small spending limits.
- The agent runs locally with `wrangler dev`, reached over `adb reverse`, but
  it still talks to the production MCP server.

## Milestones

Each milestone ends with a check on a real device or emulator, and a commit.

| #   | Milestone                                                                                                                                                                                                                                                     | Done when                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Repo and tooling.** git, npm workspaces, TypeScript strict, prettier and eslint (mirroring lanatools), `AGENTS.md`, CI checks, `.env.example` files                                                                                                         | `npm run check` passes on an empty skeleton                                                                                                         |
| 1   | **Mobile shell and design system.** Expo dev client (Android, arm64, new architecture), expo-router, theme tokens, fonts, mark, core components (Button, Card, Frame, Label, StatusDot, WalletAddress, Sheet), SideField, Boot and Welcome screens            | Welcome screen runs on the emulator in light and dark, matching lanatools.sh/sign-in: same surface, pattern, card and type, and no blue backgrounds |
| 2   | **Privy sign-in.** Polyfills, Metro `jose` browser condition, `PrivyProvider` with the same app and a new Android client, Google OAuth, MWA sign-in, embedded wallet session (port and test `walletSessionFrom`), sign-out                                    | Sign in on device; the same embedded wallet address appears as on the lanatools.sh dashboard                                                        |
| 3   | **Agent backend.** `apps/agent` on Flue (Cloudflare target), Claude model, Privy middleware, ownership check, health route, tests (forged token, wrong owner)                                                                                                 | App sends a message and streams a reply; another user's conversation id returns 403                                                                 |
| 4a  | **LanaTools: first-party consent** (lanatools repo). `POST /first-party/authorize`, allowlist, tests, PR, production deploy                                                                                                                                   | The endpoint test suite passes; the deployed endpoint refuses a third-party client_id                                                               |
| 4   | **LanaTools link.** One-time DCR registration on production, native consent card, PKCE and code exchange in the app, SecureStore tokens and refresh, `X-LanaTools-Token` handoff, D1 token table, `useMcpConnection` to production, link UI and revoked state | "What's in my wallet?" runs `get_wallet_holdings` through LanaTools; revoking in the dashboard shows "Reconnect" in the app                         |
| 5   | **Full chat UI.** Every Flue part type: markdown text, folded reasoning, tool cards, data parts. Plus stop, errors, conversation list, SSE or long-poll                                                                                                       | Tool calls, refusals and paid calls display correctly; the app survives losing the network mid-reply                                                |
| 6   | **Transaction approval.** Detect the `jupiter_build_swap` output, decode in the app, approval sheet, Privy `signAndSendTransaction` (or Jupiter execute for JupiterZ), report back to the agent, no automatic retry of a send that may already have gone out  | A swap of about $1 on mainnet signed from chat; declining stops the agent cleanly                                                                   |
| 7   | **Release.** Release keystore, SHA-256 registered with Privy, EAS build, agent deployment, Solana dApp Store listing                                                                                                                                          | Signed APK installs on a Seeker and signs in against production                                                                                     |

Later: set up agent payments from the phone instead of the web dashboard. This
depends on whether Privy's Expo SDK supports `addSigners`. Until then, users
are sent to the dashboard.

## Decisions

Settled on 2026-10-08:

1. **Tool access:** the production LanaTools MCP server, `mcp.lanatools.sh/mcp`. The agent defines no tools; every tool comes from the server. Consent happens in the app with the existing Privy session, through a new first-party endpoint on `mcp.lanatools.sh` (milestone 4a). The app shares the access token with the agent.
2. **Agent hosting:** Cloudflare Workers. Flue stores each conversation in a Durable Object; the shared MCP access tokens go in D1, encrypted and short-lived.
3. **Sign-in:** Google and the Seeker wallet (MWA). No email sign-in.
4. **App IDs:** Android package `sh.lanatools.mobile`, URL scheme `lanatools`, agent at `agent.lanatools.sh` (domain to be confirmed).

Still open:

- **Model:** Claude Sonnet by default, once we confirm Flue's provider accepts the model id.
- **Remote:** create a GitHub repository, for example `pratikbuilds/lanatools-mobile`.
