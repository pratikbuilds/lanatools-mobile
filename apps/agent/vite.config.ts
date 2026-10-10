import { cloudflare } from '@cloudflare/vite-plugin'
import { flue, flueWorkerConfig } from '@flue/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // Only Anthropic is bundled; any other model specifier fails at build.
    flue({ providers: ['anthropic'] }),
    cloudflare({ config: flueWorkerConfig() }),
  ],
  // The Android emulator reaches this through `adb reverse tcp:8787 tcp:8787`.
  server: { port: 8787 },
})
