import { cloudflare } from '@cloudflare/vite-plugin'
import { flue, flueWorkerConfig } from '@flue/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // Only Anthropic is bundled; any other model specifier fails at build.
    flue({ providers: ['anthropic'] }),
    cloudflare({ config: flueWorkerConfig() }),
  ],
  // The Android emulator reaches this through `adb reverse tcp:8787 tcp:8787`,
  // which connects over IPv4; Vite would otherwise listen on ::1 only.
  server: { host: '127.0.0.1', port: 8787 },
})
