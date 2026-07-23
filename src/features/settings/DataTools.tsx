import { Database, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRefreshMetadata } from '@/features/settings/RefreshMetadataProvider';

const MUTED = 'hsl(0 0% 63.9%)';

function ToolRow({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-4"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      {icon}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function DataTools({ onOpenImportExport }: { onOpenImportExport: () => void }) {
  const { refreshing, progress, refresh } = useRefreshMetadata();
  const [confirm, setConfirm] = useState(false);

  return (
    <View className="gap-2">
      <ToolRow
        icon={refreshing ? <ActivityIndicator size="small" color={MUTED} /> : <RefreshCw size={20} color={MUTED} />}
        title="Refresh all metadata"
        subtitle={refreshing ? `${progress.current} of ${progress.total}…` : 'Re-fetch posters, cast, and availability from TMDB'}
        onPress={() => setConfirm(true)}
        disabled={refreshing}
      />
      <ToolRow
        icon={<Database size={20} color={MUTED} />}
        title="Import / Export data"
        subtitle="Back up or restore your library as JSON"
        onPress={onOpenImportExport}
      />

      <ConfirmDialog
        visible={confirm}
        title="Refresh all metadata?"
        description="This re-fetches every title from TMDB and may take a few minutes. Your ratings and watch progress are kept. You can leave this screen while it runs."
        confirmLabel="Refresh"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void refresh();
        }}
      />
    </View>
  );
}
