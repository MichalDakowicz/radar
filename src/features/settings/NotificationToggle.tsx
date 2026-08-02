import { Switch, View } from 'react-native';

import { SettingLabel } from './SettingsSection';

type NotificationToggleProps = {
  title: string;
  description?: string;
  value: boolean;
  /** Dimmed and inert while the master switch is off. */
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

/**
 * One labelled switch. The notification section has seven of them, and the row
 * layout being repeated inline seven times is how the label and the control
 * drift apart.
 */
export function NotificationToggle({ title, description, value, disabled, onChange }: NotificationToggleProps) {
  return (
    <View className="flex-row items-center justify-between gap-4" style={{ opacity: disabled ? 0.45 : 1 }}>
      <View className="min-w-0 flex-1">
        <SettingLabel title={title} description={description} />
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: 'hsl(217 91% 60%)', false: 'hsl(0 0% 25%)' }}
      />
    </View>
  );
}
