import { Redirect, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/features/auth/authActions';
import { useAuth } from '@/features/auth/AuthProvider';

export default function Login() {
  const { user } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [busy, setBusy] = useState(false);

  // `as Href`: expo-router's generated route union is unstable for the
  // transparent (tabs) group across typegen runs (observed in Phase 3) -
  // "/" always resolves correctly at runtime regardless.
  if (user) return <Redirect href={'/' as Href} />;

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      show(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => runAction(signInWithGoogle);

  const handleEmail = () => {
    if (!email || !password) return show('Enter an email and password');
    runAction(() => (mode === 'signIn' ? signInWithEmail(email, password) : signUpWithEmail(email, password)));
  };

  return (
    <View className="flex-1 items-center justify-center gap-10 bg-background px-6">
      <View className="items-center gap-2">
        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Text className="text-4xl font-bold text-primary">R</Text>
        </View>
        <Text className="text-4xl font-bold tracking-tight text-foreground">Radar</Text>
        <Text className="text-muted-foreground">Curate and track your movie watchlist.</Text>
      </View>

      <View className="w-full gap-3">
        <Pressable
          onPress={handleGoogle}
          disabled={busy}
          className="flex-row items-center justify-center gap-2 rounded-full bg-foreground py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="font-medium text-background">Sign in with Google</Text>
        </Pressable>

        <View className="my-1 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-xs text-muted-foreground">OR</Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="hsl(0 0% 63.9%)"
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-full border border-border px-5 py-3 text-foreground"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="hsl(0 0% 63.9%)"
          secureTextEntry
          className="rounded-full border border-border px-5 py-3 text-foreground"
        />

        <Pressable
          onPress={handleEmail}
          disabled={busy}
          className="flex-row items-center justify-center gap-2 rounded-full border border-border py-3 active:opacity-80 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text className="font-medium text-foreground">
              {mode === 'signIn' ? 'Sign in with email' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="items-center py-1">
          <Text className="text-sm text-muted-foreground">
            {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
