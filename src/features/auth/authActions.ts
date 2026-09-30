import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { clearAllPushTokens, clearPushToken } from '@/lib/pushRegistration';
import { supabase } from '@/lib/supabase';

// Completes the auth session popup on web - recommended by expo-web-browser.
WebBrowser.maybeCompleteAuthSession();

/**
 * Browser-based OAuth (works uniformly on web/iOS/Android via expo-web-browser
 * + PKCE) rather than the native @react-native-google-signin SDK - doc 07
 * prefers the native SDK for a tighter UX, but that needs a separate Google
 * Cloud "native" OAuth client (webClientId/iOS client id/Android SHA-1) that
 * hasn't been provisioned yet (see rewrite tasklist Step 0). This path only
 * needs the Google provider already enabled in the Supabase dashboard.
 */
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase did not return an OAuth URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return;

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code as string | undefined;
  if (!code) return;

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

/**
 * `local` ends Radar's session only. `global` ends every session the account
 * has — every Ping app, on every device and on the web. The scope is always
 * explicit because supabase-js defaults to `global`.
 */
export type SignOutScope = 'local' | 'global';

export async function signOut(scope: SignOutScope) {
  // Before signOut, not after: device_tokens is owner-scoped by RLS, so a delete
  // issued once the session is gone matches nothing and this phone keeps getting
  // push meant for an account that is no longer signed in on it.
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  await (scope === 'global' && userId ? clearAllPushTokens(userId) : clearPushToken());
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw error;
}
