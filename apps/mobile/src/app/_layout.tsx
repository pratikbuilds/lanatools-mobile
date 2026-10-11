import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useReducedMotion } from 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConversationsProvider } from '../agent/store'
import { LanaToolsProvider } from '../lanatools/link'
import { DraftProvider } from '../chat/draft'
import { OnboardingProvider, useOnboarding } from '../onboarding/seen'
import { SessionProvider } from '../session/session'
import { ThemeProvider, useTheme } from '../theme/theme'
import { BalancesProvider } from '../wallet/provider'
import { radius } from '../theme/tokens'

// Fonts are embedded at build time, so the first frame is already in the
// brand's type; the splash covers React starting up and reading the
// remembered theme and introduction, so neither flashes.
void SplashScreen.preventAutoHideAsync()

function Screens() {
  const { colors, name, ready: themeReady } = useTheme()
  const onboarding = useOnboarding()
  const ready = themeReady && onboarding.ready
  const reduced = useReducedMotion()
  const sheet = {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: 'fitToContents' as const,
    sheetCornerRadius: radius.frame + 4,
    contentStyle: { backgroundColor: colors.panel },
  }
  useEffect(() => {
    if (ready) SplashScreen.hide()
  }, [ready])
  if (!ready) return null
  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // The platform's own transitions; a fade when motion is reduced.
          animation: reduced ? 'fade' : 'default',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* The chat arrives from the introduction with a fade. */}
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="onboarding"
          options={{ animation: reduced ? 'fade' : 'fade_from_bottom' }}
        />
        <Stack.Screen name="settings" />
        {/* Short interruptions, so the platform's own bottom sheet: it drags,
          dims, and closes on back for free. */}
        <Stack.Screen name="sign-in" options={sheet} />
        <Stack.Screen name="tools" />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="wallet" options={sheet} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <OnboardingProvider>
              <SessionProvider>
                <LanaToolsProvider>
                  <ConversationsProvider>
                    <BalancesProvider>
                      <DraftProvider>
                        <Screens />
                      </DraftProvider>
                    </BalancesProvider>
                  </ConversationsProvider>
                </LanaToolsProvider>
              </SessionProvider>
            </OnboardingProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
