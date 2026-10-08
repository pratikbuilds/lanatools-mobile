import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SessionProvider } from '../session/session'
import { ThemeProvider, useTheme } from '../theme/theme'

// Fonts are embedded at build time, so the first frame is already in the
// brand's type; the splash only covers React starting up.
void SplashScreen.preventAutoHideAsync()

function Screens() {
  const { colors } = useTheme()
  useEffect(() => {
    SplashScreen.hide()
  }, [])
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 200,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <SessionProvider>
              <Screens />
            </SessionProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 } })
