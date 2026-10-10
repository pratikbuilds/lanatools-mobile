# LanaTools Mobile

An Android app for the Solana Seeker: sign in with Privy and chat with an agent
that uses the LanaTools MCP tools. See [docs/PLAN.md](docs/PLAN.md).

| Path          | What it owns                            |
| ------------- | --------------------------------------- |
| `apps/mobile` | The Expo app (Android only, dev client) |
| `apps/agent`  | The Flue agent (Cloudflare Workers)     |
| `docs`        | The plan, decisions and setup notes     |

## Development

Needs Node 22.19+, JDK 17 and the Android SDK with an emulator.

```sh
npm install
npm run android --workspace apps/mobile   # first build, or after native changes
npm run mobile                            # Metro for JS-only changes
```

The app talks to the agent unless `EXPO_PUBLIC_MOCK_AGENT=1`. To run the
agent, copy `apps/agent/.dev.vars.example` to `.dev.vars`, add an Anthropic
key, then:

```sh
npm run dev --workspace apps/agent    # http://localhost:8787
adb reverse tcp:8787 tcp:8787         # so the emulator reaches it
```

`npm run check` runs formatting, lint, type checks and tests.

`apps/mobile/scripts/brand-assets.sh` renders the launcher icons and splash
marks from the LanaTools mark. Fonts are Paper Mono and Inter Tight, both under
the SIL Open Font License (`apps/mobile/assets/fonts`).
