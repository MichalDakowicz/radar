import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Edit2, Share2 } from 'lucide-react-native';
import { Platform, Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/hooks/useProfile';

function publicShelfUrl(userId: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/u/${userId}`;
  }
  return Linking.createURL(`/u/${userId}`);
}

export function ProfileHeader({ onEdit }: { onEdit: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { show } = useToast();

  const name = profile?.displayName || profile?.username || 'You';
  const handle = profile?.username ? `@${profile.username}` : user?.email;

  const share = async () => {
    if (!user) return;
    await Clipboard.setStringAsync(publicShelfUrl(user.id));
    show('Public shelf link copied');
  };

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-4">
        {profile?.pfp ? (
          <Image source={{ uri: profile.pfp }} style={{ width: 72, height: 72, borderRadius: 36 }} contentFit="cover" />
        ) : (
          <View className="h-18 w-18 items-center justify-center rounded-full border border-border bg-secondary" style={{ width: 72, height: 72 }}>
            <Text className="text-2xl font-bold text-muted-foreground">{name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-2xl font-bold tracking-tight text-foreground">{name}</Text>
          {!!handle && <Text className="text-sm text-muted-foreground">{handle}</Text>}
          {!!user?.email && handle !== user.email && <Text className="text-xs text-muted-foreground">{user.email}</Text>}
        </View>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onEdit}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-card py-3"
        >
          <Edit2 size={16} color="hsl(0 0% 98%)" />
          <Text className="text-sm font-semibold text-foreground">Edit profile</Text>
        </Pressable>
        <Pressable
          onPress={share}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-card py-3"
        >
          <Share2 size={16} color="hsl(0 0% 98%)" />
          <Text className="text-sm font-semibold text-foreground">Share shelf</Text>
        </Pressable>
      </View>
    </View>
  );
}
