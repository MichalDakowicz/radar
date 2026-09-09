import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { daysUntil, todayKey, type LeavingTitle } from '@/lib/leaving';

import { LeavingRow } from './LeavingRow';

// An agenda, not a month grid. The release calendar can be a grid because
// releases are sparse and spread out; expirations clump violently on the last
// day of the month — the measured Polish catalogue had 87 of 157 titles landing
// on one square. A grid cell reading "87" is not a calendar, it is a shrug.

function dayHeading(date: string, today: string): string {
  const days = daysUntil(date, today);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

type LeavingAgendaProps = {
  byDay: Map<string, LeavingTitle[]>;
  onPress: (entry: LeavingTitle) => void;
};

export function LeavingAgenda({ byDay, onPress }: LeavingAgendaProps) {
  const today = todayKey();
  const days = [...byDay.keys()].sort();

  return (
    <View className="gap-5">
      {days.map((date) => {
        const entries = byDay.get(date) ?? [];
        return (
          <Fragment key={date}>
            <View className="flex-row items-baseline justify-between">
              <Text className="text-base font-semibold text-foreground">{dayHeading(date, today)}</Text>
              <Text className="text-xs text-muted-foreground">
                {entries.length} {entries.length === 1 ? 'title' : 'titles'}
              </Text>
            </View>
            <View className="gap-2">
              {entries.map((entry) => (
                <LeavingRow key={`${entry.mediaType}-${entry.tmdbId}`} entry={entry} onPress={onPress} />
              ))}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
