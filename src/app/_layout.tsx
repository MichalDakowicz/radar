import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NAV_DESTINATIONS } from '@/components/layout/navDestinations';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { RefreshMetadataProvider } from '@/features/settings/RefreshMetadataProvider';
import { UpdateNotice } from '@/features/updates/UpdateNotice';
import { useWebShortcuts } from '@/hooks/useWebShortcuts';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Side-effect import: TaskManager.defineTask has to have run by the time the OS
// wakes the app headlessly for the background metadata refresh, and this module
// is the first thing the router entry loads.
import '@/lib/backgroundRefreshTask';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Mirrors the current AuthProvider: children never mount until auth resolves.
  if (loading) return null;

  return <>{children}</>;
}

/**
 * Root-level keyboard wiring for the browser build. Nav chrome itself lives in
 * the top bar (components/layout/Header), matching legacy - but the digit
 * shortcuts have to be registered above the navigator so they work on every
 * route, not just the five that render a Header.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const selectTab = useCallback(
    (index: number) => {
      const destination = NAV_DESTINATIONS[index];
      if (destination) router.navigate(destination.href);
    },
    [router],
  );
  useWebShortcuts({ onSelectTab: selectTab });

  return (
    <>
      {children}
      <UpdateNotice />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <RefreshMetadataProvider>
                {/* No BottomSheetModalProvider: sheets are plain RN Modals now
                    (components/ui/SheetPanel). GestureHandlerRootView stays —
                    the card hover/press affordances still use
                    react-native-gesture-handler. */}
                <AuthGate>
                  <AppShell>
                    <Stack screenOptions={{ headerShown: false }} />
                  </AppShell>
                </AuthGate>
              </RefreshMetadataProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
