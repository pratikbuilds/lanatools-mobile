# LanaTools Mobile

An Android app that puts a Solana agent in your pocket. You sign in with
Google or with any Solana wallet app on the phone, then chat with an agent
that can look up wallets, tokens and markets, call paid APIs, and prepare
swaps, transfers and perp orders. Every tool comes from the production
[LanaTools](https://lanatools.sh) MCP server, inside the grant and spending
limit you approve. Transactions are signed on the phone, in the app, and
never by the agent.

> **Status:** pre-release, Android only. It runs against Solana mainnet and
> the production LanaTools service, so swaps and paid calls move real money.
> The latest APK is on the
> [releases page](https://github.com/pratikbuilds/lanatools-mobile/releases/latest).

## How it works

```
Phone (apps/mobile)                 Agent (apps/agent)            LanaTools
──────────────────                  ──────────────────            ─────────
Privy sign-in ─────────────────────► verify Privy token
in-app consent (PKCE) ─────────────────────────────────────────► /first-party/authorize, /token
each message + LanaTools token ───► store token ≤ 1h ─ bearer ─► /mcp (every tool)
                                    Claude + MCP tools
tool prepares a transaction ◄─────── review card ◄──────────────── unsigned tx + review
user signs on the phone ──────────────────────────────────────────► send_transaction
```

1. **Sign in.** [Privy](https://privy.io) handles Google sign-in, or a
   Solana wallet app signs a Sign In With Solana message over
   [Mobile Wallet Adapter](https://docs.solanamobile.com/). Each user gets
   a Privy embedded Solana wallet, the same one the LanaTools dashboard
   shows.
2. **Connect LanaTools.** A native consent screen lets you pick tool
   families (Helius, Jupiter, Phoenix, pay.sh payments, transfers) and a
   USD spending limit for paid calls. The app completes an ordinary OAuth
   PKCE grant for the "LanaTools Mobile" client, without leaving the app.
   You can change or revoke it on lanatools.sh at any time.
3. **Chat.** The agent runs on [Flue](https://github.com/withastro/flue) on
   Cloudflare Workers with Claude. It defines no tools of its own: it
   connects to `https://mcp.lanatools.sh/mcp` with your access token and
   uses whatever your grant allows.
4. **Sign.** Transaction tools return an unsigned transaction and
   LanaTools' review of it. The app shows the review; you sign with your
   wallet app, or with the embedded wallet if you signed in with Google;
   LanaTools checks the bytes are unchanged and relays them.

## Repository

| Path          | What it is                                                      |
| ------------- | --------------------------------------------------------------- |
| `apps/mobile` | The Expo app (SDK 57, React Native, Expo Router). Android only. |
| `apps/agent`  | The Flue agent: Hono routes, Privy verification, token store.   |
| `docs`        | [The plan and its decisions](docs/PLAN.md).                     |

Both are npm workspaces. Shared tooling (Prettier, ESLint, TypeScript) lives
at the root.

## Security model

- **The agent verifies every request.** Each call carries the user's Privy
  access token, checked against Privy's published keys (ES256, issuer
  `privy.io`, audience = app ID). The agent never holds the Privy app
  secret.
- **Conversations belong to one user.** Ids are `<hash of user>.<uuid>`
  and the agent refuses any id that doesn't start with the caller's hash.
- **The agent only ever holds a short-lived access token.** The app keeps
  the refresh token in Android's secure storage and hands the agent a fresh
  access token with each message. The agent stores it encrypted
  (AES-GCM, bound to the user) for at most an hour, then forgets it.
- **Consent never redirects.** The authorization code comes back in the
  response body, so no other app on the phone can intercept it.
- **Keys stay on the phone.** The agent asks LanaTools to prepare
  transactions for your wallet and stops. Nothing moves until you sign on
  the phone. The app checks the fee payer is your wallet before signing.
- **What you sign is what LanaTools built.** The review on the sign page is
  LanaTools' own account of the transaction. If you sign with a wallet app,
  it shows its own simulation too.
- **No secrets in the app.** Every `EXPO_PUBLIC_*` value is public by
  design. Secrets live only in Worker secrets and your local `.dev.vars`.

## Running it

You need Node 22.19 or newer, JDK 17, and the Android SDK with an emulator
or a phone in developer mode. Expo Go cannot load Privy's native modules, so
the app is a development client.

```sh
npm install
cp apps/mobile/.env.example apps/mobile/.env
npm run android --workspace apps/mobile   # builds and installs the dev client
npm run mobile                            # Metro, for JS-only changes
```

Without Privy IDs in `.env` the app signs in to a mock wallet, and with
`EXPO_PUBLIC_MOCK_AGENT=1` it plays back a scripted agent, so the whole flow
can be tried with nothing deployed and no funds.

### The agent

```sh
cp apps/agent/.dev.vars.example apps/agent/.dev.vars   # add an Anthropic key and a token key
npm run dev --workspace apps/agent                      # http://localhost:8787
adb reverse tcp:8787 tcp:8787                           # so the emulator reaches it
```

The local agent still talks to the production LanaTools server, so use a
test Google account, a wallet with a few dollars, and a small spending limit.

### Configuration

Values in `apps/mobile/.env` are compiled into the app and are public.

| Variable                      | Meaning                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `EXPO_PUBLIC_PRIVY_APP_ID`    | The Privy app. Defaults to LanaTools' production app.           |
| `EXPO_PUBLIC_PRIVY_CLIENT_ID` | A Privy Android app client for this package and signing key.    |
| `EXPO_PUBLIC_AGENT_URL`       | Where the agent runs. Must be `https` outside development.      |
| `EXPO_PUBLIC_SOLANA_RPC_URL`  | RPC for balances. Public mainnet by default; never a keyed URL. |
| `EXPO_PUBLIC_MOCK_AGENT`      | `1` plays back a mock agent instead of the real one.            |
| `EXPO_PUBLIC_MOCK_WALLET`     | `1` signs in to a mock wallet when there is no Privy client ID. |

The agent reads `PRIVY_APP_ID` from `wrangler.jsonc` and two secrets:
`ANTHROPIC_API_KEY` and `LANATOOLS_TOKEN_KEY` (32 random bytes, base64, used
to encrypt access tokens at rest).

### Deploying the agent

```sh
npx wrangler d1 create lanatools-agent          # put the id in wrangler.jsonc
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put LANATOOLS_TOKEN_KEY
npm run deploy --workspace apps/agent
```

`wrangler.jsonc` serves the Worker at `agent.lanatools.sh`, the URL that
release builds are compiled against (`apps/mobile/.env.production`). A fork
changes both.

### Building a release APK

Release builds are signed with a keystore that is never in the repository:

```sh
keytool -genkeypair -keystore ~/.config/lanatools-mobile/release.keystore \
  -alias lanatools -keyalg RSA -keysize 4096 -validity 10950
```

Put its path, alias and passwords in `~/.config/lanatools-mobile/release.env`
as `export LANATOOLS_RELEASE_KEYSTORE=...`, `LANATOOLS_RELEASE_KEY_ALIAS`,
`LANATOOLS_RELEASE_KEYSTORE_PASSWORD` and `LANATOOLS_RELEASE_KEY_PASSWORD`,
register the keystore's SHA-256 on the Privy Android client, then:

```sh
apps/mobile/scripts/build-release.sh    # apps/mobile/dist/lanatools-<version>.apk
```

Back the keystore up. Android only installs an update signed with the same
key, and Privy only accepts sign-ins from a registered certificate. Releases
are published as APKs on the
[GitHub releases page](https://github.com/pratikbuilds/lanatools-mobile/releases/latest).

### Running your own copy

The app is built for LanaTools' production service. A fork that wants its
own backend needs its own Privy app with an Android app client (package
name, signing-certificate SHA-256 and the `lanatools` scheme), and a
first-party OAuth client allowlisted on its own LanaTools MCP server. The
OAuth client ID in `apps/mobile/src/lanatools/oauth.ts` is a public PKCE
client with no secret.

## Development

`npm run check` runs formatting, lint, type checks and the tests in both
workspaces; CI runs the same on every push. Add packages to the app with
`npx expo install` so versions match the Expo SDK, and never edit
`apps/mobile/android`: it is generated.

Every UI change is verified on the emulator in light and dark themes. The
design is ported from the LanaTools dashboard; tokens, type and motion rules
are in `apps/mobile/src/theme`, and the conventions agents follow are in
[AGENTS.md](AGENTS.md).

`apps/mobile/scripts/brand-assets.sh` renders the launcher icons and splash
marks from the LanaTools mark. Fonts are Paper Mono and Inter Tight, both
under the SIL Open Font License (`apps/mobile/assets/fonts`).

## License

[Apache-2.0](LICENSE). Copyright 2026 LanaTools.
