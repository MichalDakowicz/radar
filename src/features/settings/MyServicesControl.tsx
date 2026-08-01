import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ServiceIcon } from '@/components/media/ServiceIcon';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ALL_SERVICES, getServiceStyle } from '@/lib/services';

import { SettingLabel } from './SettingsSection';

// Which streaming services the user subscribes to (user_settings.owned_services).
// Feeds the Library filter sheet's "My services" chip - nothing else reads it,
// so an empty list simply means that chip does not appear.
export function MyServicesControl() {
  const { settings, updateSettings } = useUserSettings();
  const owned = settings.ownedServices;

  const toggle = (service: string) => {
    const next = owned.includes(service) ? owned.filter((s) => s !== service) : [...owned, service];
    void updateSettings({ ownedServices: next });
  };

  return (
    <>
      <SettingLabel
        title="My services"
        description="Pick what you subscribe to, then filter your Library down to it with one tap"
      />
      <View className="flex-row flex-wrap gap-2">
        {ALL_SERVICES.map((service) => {
          const active = owned.includes(service);
          const style = getServiceStyle(service);
          return (
            <Pressable
              key={service}
              onPress={() => toggle(service)}
              className="flex-row items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3"
              style={{
                borderColor: active ? style.color : 'hsl(0 0% 25%)',
                backgroundColor: active ? `${style.color}26` : 'transparent',
                // Unpicked services read as available rather than disabled, so
                // the logo is dimmed instead of dropped - the mark is how you
                // find the service in the grid.
                opacity: active ? 1 : 0.65,
              }}
            >
              <ServiceIcon service={service} size={24} />
              <Text className={active ? 'text-foreground' : 'text-muted-foreground'}>{service}</Text>
              {active && <Check size={14} color={style.color} />}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
