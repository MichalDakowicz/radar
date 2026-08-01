import { useRouter } from 'expo-router';
import { Plus, Settings as SettingsIcon, Share2, Shuffle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Logo from '@/assets/brand/logo.svg';
import { ContentShell } from '@/components/layout/ContentShell';
import { NavLinks } from '@/components/layout/NavLinks';
import { MAX_W, useHover, useIsDesktop, webTransition } from '@/hooks/useResponsive';
import { useQuickAddSheetStore } from '@/store/quickAddSheet';

type HeaderProps = {
  onRandomPick?: () => void;
  onShare?: () => void;
  /** Profile only: the gear that pushes /settings, which has no tab of its own. */
  onSettings?: () => void;
  /**
   * Screen-specific controls, rendered left of the global buttons. Screens with
   * their own chrome (Social's inbox and Find) hang it here instead of building
   * a bar of their own, which would cost them the logo and the desktop nav.
   */
  actions?: ReactNode;
  refreshingLabel?: string;
  /** Desktop only: align the bar with the screen's content column (MAX_W.*). */
  maxWidth?: number;
};

// Global top bar (ported from legacy Navbar.jsx) - logo/title on the left,
// "Add Movie" (global) + "Pick Random" (Library only, via prop) + Share
// (public shelf, Phase 8) on the right.
//
// On desktop web this bar also carries the destination links, exactly like
// legacy's navbar: one row of chrome at the top instead of a side rail eating
// horizontal space. The bottom tabs cover the same routes on phones.
export function Header({
  onRandomPick,
  onShare,
  onSettings,
  actions,
  refreshingLabel,
  maxWidth = MAX_W.grid,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const presentQuickAdd = useQuickAddSheetStore((s) => s.present);

  if (isDesktop) {
    return (
      <View className="border-b border-border bg-background px-6 py-3">
        <ContentShell maxWidth={maxWidth}>
          <View className="flex-row items-center justify-between gap-6">
            <Pressable
              onPress={() => router.navigate('/')}
              accessibilityLabel="Radar home"
              className="min-w-0 flex-row items-center gap-2.5"
            >
              <Logo width={30} height={30} />
              <Text className="text-2xl font-bold tracking-tight text-foreground">Radar</Text>
              {!!refreshingLabel && (
                <View className="ml-1 rounded bg-secondary px-2 py-1">
                  <Text className="text-xs font-medium text-muted-foreground">{refreshingLabel}</Text>
                </View>
              )}
            </Pressable>

            <View className="flex-row items-center gap-2">
              {actions}
              {!!onRandomPick && (
                <BarButton onPress={onRandomPick} label="Pick Random" icon={<Shuffle size={15} color="hsl(0 0% 98%)" />} />
              )}
              <BarButton onPress={() => presentQuickAdd?.()} label="Add Movie" icon={<Plus size={15} color="#fff" />} primary />
              {!!onShare && <BarButton onPress={onShare} label="Share shelf" icon={<Share2 size={15} color="hsl(0 0% 98%)" />} />}
              {!!onSettings && (
                <BarButton onPress={onSettings} label="Settings" icon={<SettingsIcon size={15} color="hsl(0 0% 98%)" />} />
              )}
              <NavLinks />
            </View>
          </View>
        </ContentShell>
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center justify-between gap-3 border-b border-border bg-background/95 px-4 pb-3"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <Logo width={32} height={32} />
        <Text className="text-2xl font-bold tracking-tight text-foreground">Radar</Text>
        {!!refreshingLabel && (
          <View className="rounded bg-secondary px-2 py-1">
            <Text className="text-xs font-medium text-muted-foreground">{refreshingLabel}</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        {actions}
        {!!onRandomPick && (
          <Pressable onPress={onRandomPick} className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-2">
            <Shuffle size={16} color="hsl(0 0% 98%)" />
          </Pressable>
        )}
        <Pressable onPress={() => presentQuickAdd?.()} className="flex-row items-center gap-1.5 rounded-full bg-primary px-3 py-2">
          <Plus size={16} color="#fff" />
        </Pressable>
        {!!onShare && (
          <Pressable onPress={onShare} className="rounded-full p-2">
            <Share2 size={18} color="hsl(0 0% 63.9%)" />
          </Pressable>
        )}
        {!!onSettings && (
          <Pressable
            onPress={onSettings}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
          >
            <SettingsIcon size={20} color="hsl(0 0% 98%)" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function BarButton({
  onPress,
  label,
  icon,
  primary,
}: {
  onPress: () => void;
  label: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  const { hovered, bind } = useHover();
  return (
    <Pressable
      {...bind}
      onPress={onPress}
      accessibilityLabel={label}
      style={[
        primary
          ? { opacity: hovered ? 0.9 : 1 }
          : { backgroundColor: hovered ? 'hsl(0 0% 100% / 0.07)' : 'transparent' },
        webTransition('background-color, opacity'),
      ]}
      className={
        primary
          ? 'h-9 flex-row items-center gap-2 rounded-full bg-primary px-4'
          : 'h-9 flex-row items-center gap-2 rounded-full border border-border px-4'
      }
    >
      {icon}
      <Text className={primary ? 'text-sm font-bold text-primary-foreground' : 'text-sm font-medium text-foreground'}>{label}</Text>
    </Pressable>
  );
}
