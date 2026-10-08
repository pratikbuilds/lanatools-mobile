# Agent instructions

LanaTools Mobile: an Android app for the Solana Seeker. Sign in with Privy, then
chat with an agent that uses the production LanaTools MCP tools. The plan and
its decisions are in [docs/PLAN.md](docs/PLAN.md).

- **Design comes from LanaTools, never from elsewhere.** Port tokens, type and
  patterns from `../lanatools/apps/web/src/styles.css` (the `.dash` dashboard
  styles), `sign-in.tsx` and `side-field.tsx`. No blue page backgrounds; blue is
  an accent. `../mobile` is a technical reference for Privy, MWA and Flue only,
  never for design.
- **Verify every UI change on the Android emulator** with screenshots in both
  themes before calling it done. Typecheck and lint are not enough.
- **No agent-side tools.** The Flue agent connects to
  `https://mcp.lanatools.sh/mcp` and gets every tool from there.
- **Review every screen against the eight design principles** from Expo's
  "professional design principles" guide before you commit: contrast (one
  focal point), hierarchy, alignment (one 16px edge), proximity, repetition
  (LanaTools radii: 14 frame, 10 card, 9 button), balance, white space and
  unity. Critique the emulator screenshot, revise, and look again.
- **Motion follows Emil Kowalski's `animate-expo` rules.**
  - Use the constants in `apps/mobile/src/theme/motion.ts`.
  - Animate transform and opacity only, never layout.
  - Press feedback is `PressableScale`: 97% scale over 120ms.
  - Sheets are native `formSheet` routes.
  - The keyboard is followed with `react-native-keyboard-controller` shared values.
  - Use `.get()`/`.set()` on shared values, and `scheduleOnRN`, not `runOnJS`.
  - Every animation honours reduced motion.
- Run `npm run check` (format, lint, typecheck, tests) before committing.
- Use `npx expo install` to add packages to `apps/mobile`, so versions match
  the Expo SDK. Never edit `apps/mobile/android`; it is generated.
- Never put a secret in an `EXPO_PUBLIC_*` variable.
