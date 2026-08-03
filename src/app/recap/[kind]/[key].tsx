import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/AuthProvider';
import { MonthlyRecapDeck } from '@/features/recap/MonthlyRecapDeck';
import { YearlyRecapDeck } from '@/features/recap/YearlyRecapDeck';
import { useRecap } from '@/features/recap/useRecap';
import { RECAP } from '@/features/recap/recapTheme';
import { useProfile } from '@/hooks/useProfile';
import { isValidPeriodKey, periodLabel, type RecapKind } from '@/lib/recapPeriod';

// The recap player. A full-screen route rather than a sheet: it is a story with
// its own chrome and its own dark canvas, and a sheet would put the app's header
// above it.
export default function RecapScreen() {
  const { kind, key } = useLocalSearchParams<{ kind: string; key: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  const validKind: RecapKind | null = kind === 'month' || kind === 'year' ? kind : null;
  const valid = !!validKind && !!key && isValidPeriodKey(validKind, key);
  const { recap, loading, error } = useRecap(validKind ?? 'month', valid ? key : '');

  if (!valid) {
    return (
      <View className="flex-1" style={{ backgroundColor: RECAP.bg }}>
        <ErrorState message="That is not a recap Radar can build" onRetry={() => router.back()} />
      </View>
    );
  }
  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: RECAP.bg }}>
        <LoadingState label={`Building ${periodLabel(validKind!, key)}…`} />
      </View>
    );
  }
  if (error || !recap) {
    return (
      <View className="flex-1" style={{ backgroundColor: RECAP.bg }}>
        <ErrorState
          message={error instanceof Error ? error.message : 'Could not build this recap'}
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  return recap.kind === 'year' ? (
    <YearlyRecapDeck recap={recap} username={profile?.username ?? 'you'} onClose={() => router.back()} />
  ) : (
    <MonthlyRecapDeck recap={recap} onClose={() => router.back()} />
  );
}
