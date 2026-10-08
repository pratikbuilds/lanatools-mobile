import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useReducedMotion } from 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { DraftProvider } from '../chat/draft'
import { SessionProvider } from '../session/session'
import { ThemeProvider, useTheme } from '../theme/theme'
import { radius } from '../theme/tokens'

// Fonts are embedded at build time, so the first frame is already in the
// brand's type; the splash only covers React starting up.
void SplashScreen.preventAutoHideAsync()

function Screens() {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  useEffect(() => {
    SplashScreen.hide()
  }, [])
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // The platform's own transitions; a fade when motion is reduced.
        animation: reduced ? 'fade' : 'default',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      {/* A short interruption, so the platform's own bottom sheet: it drags,
          dims, and closes on back for free. */}
      <Stack.Screen
        name="sign-in"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetCornerRadius: radius.frame + 4,
          contentStyle: { backgroundColor: colors.panel },
        }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <SessionProvider>
              <DraftProvider>
                <Screens />
              </DraftProvider>
            </SessionProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
