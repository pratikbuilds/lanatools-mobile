import { createContext, use, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as SystemUI from 'expo-system-ui'
import type { ReactNode } from 'react'
import { palettes } from './tokens'
import type { Palette, ThemeName } from './tokens'

// The same key the dashboard keeps its choice under.
const KEY = 'lt-theme'

export type Preference = 'system' | ThemeName

type Theme = {
  name: ThemeName
  colors: Palette
  preference: Preference
  setPreference: (preference: Preference) => void
}

const ThemeContext = createContext<Theme | null>(null)

/**
 * The colour theme. It follows the system until the user picks light or
 * dark in settings, and the pick is remembered on this device.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [picked, setPicked] = useState<ThemeName | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark') setPicked(value)
      })
      // Not remembered: the system theme still applies.
      .catch(() => {})
  }, [])

  const name: ThemeName = picked ?? (system === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    // The window behind the app, seen during transitions and the keyboard.
    void SystemUI.setBackgroundColorAsync(palettes[name].bg)
  }, [name])

  const value = useMemo<Theme>(
    () => ({
      name,
      colors: palettes[name],
      preference: picked ?? 'system',
      setPreference: (preference) => {
        setPicked(preference === 'system' ? null : preference)
        const write =
          preference === 'system'
            ? SecureStore.deleteItemAsync(KEY)
            : SecureStore.setItemAsync(KEY, preference)
        write.catch(() => {})
      },
    }),
    [name, picked],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const theme = use(ThemeContext)
  if (!theme) throw new Error('useTheme needs a ThemeProvider')
  return theme
}
