# LanaTools Mobile

An Android app for Solana: sign in with Privy (Google, or any wallet app on the
phone over Mobile Wallet Adapter) and chat with an agent that uses the LanaTools MCP tools. See [docs/PLAN.md](docs/PLAN.md).

| Path          | What it owns                            |
| ------------- | --------------------------------------- |
| `apps/mobile` | The Expo app (Android only, dev client) |
| `docs`        | The plan, decisions and setup notes     |

## Development

Needs Node 22.19+, JDK 17 and the Android SDK with an emulator.

```sh
npm install
npm run android --workspace apps/mobile   # first build, or after native changes
npm run mobile                            # Metro for JS-only changes
```

`npm run check` runs formatting, lint, type checks and tests.

`apps/mobile/scripts/brand-assets.sh` renders the launcher icons and splash
marks from the LanaTools mark. Fonts are Paper Mono and Inter Tight, both under
the SIL Open Font License (`apps/mobile/assets/fonts`).
