import { useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { dateKey } from '@/lib/stats';

// Movie/TV watch-activity calendar (legacy StreakCalendar.jsx + TVStreakCalendar.jsx
// merged - they were identical apart from the accent color and the data source).
// Weeks scroll horizontally; day labels stay pinned on the left.

const WEEKS_TO_SHOW = 26; // ~6 months back
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Accent = 'movie' | 'tv';

type StreakCalendarProps = {
  /** date "YYYY-MM-DD" -> count watched that day */
  daily: Record<string, number>;
  accent: Accent;
  unit: 'movie' | 'episode';
  onDayPress?: (dateStr: string) => void;
};

type Day = { date: Date; dateStr: string; day: number; count: number; isToday: boolean; isFuture: boolean };
type Week = { label: string; days: Day[] };

function buildWeeks(daily: Record<string, number>): Week[] {
  const today = new Date();
  const todayStr = dateKey(today);
  const weeks: Week[] = [];

  for (let weekIndex = WEEKS_TO_SHOW; weekIndex >= 0; weekIndex--) {
    const target = new Date(today);
    target.setDate(target.getDate() - weekIndex * 7);

    const start = new Date(target);
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    start.setHours(0, 0, 0, 0);

    const label = start.getDate() <= 7 ? start.toLocaleDateString('en-US', { month: 'short' }) : '';
    const days: Day[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = dateKey(date);
      days.push({
        date,
        dateStr,
        day: date.getDate(),
        count: daily[dateStr] || 0,
        isToday: dateStr === todayStr,
        isFuture: date > today,
      });
    }
    weeks.push({ label, days });
  }
  return weeks;
}

export function StreakCalendar({ daily, accent, unit, onDayPress }: StreakCalendarProps) {
  const weeks = buildWeeks(daily);
  const scrollRef = useRef<ScrollView>(null);
  const didInit = useRef(false);
  const filled = accent === 'movie' ? 'bg-blue-500/30 border-blue-500/50' : 'bg-purple-500/30 border-purple-500/50';
  const ring = accent === 'movie' ? 'border-blue-400' : 'border-purple-400';
  const dot = accent === 'movie' ? 'bg-blue-400' : 'bg-purple-400';

  return (
    <View className="flex-row gap-2">
      {/* Pinned day-of-week labels */}
      <View className="gap-1.5">
        <View className="h-4" />
        {WEEK_DAYS.map((d) => (
          <View key={d} className="h-10 items-end justify-center pr-1">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 6 }}
        // Weeks run oldest -> newest, so open scrolled to the right (most recent).
        onContentSizeChange={() => {
          if (didInit.current) return;
          didInit.current = true;
          scrollRef.current?.scrollToEnd({ animated: false });
        }}
      >
        {weeks.map((week, wi) => (
          <View key={wi} className="gap-1.5">
            <View className="h-4 items-center justify-center">
              <Text className="text-[10px] font-semibold text-muted-foreground">{week.label}</Text>
            </View>
            {week.days.map((day, di) => {
              const interactive = !!onDayPress && !day.isFuture;
              return (
                <Pressable
                  key={di}
                  disabled={!interactive}
                  onPress={() => interactive && onDayPress?.(day.dateStr)}
                  accessibilityLabel={`${day.dateStr}: ${day.count} ${unit}${day.count === 1 ? '' : 's'}`}
                  className={`h-10 w-10 items-center justify-center rounded-md border ${
                    day.isFuture
                      ? 'border-border/30 bg-secondary/20 opacity-30'
                      : day.count > 0
                        ? filled
                        : 'border-border/50 bg-secondary/30'
                  } ${day.isToday ? `border-2 ${ring}` : ''}`}
                >
                  <Text className={`text-xs font-medium ${day.count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {day.day}
                  </Text>
                  {day.count > 0 && (
                    <View className="mt-0.5 flex-row gap-0.5">
                      {Array.from({ length: Math.min(day.count, 4) }).map((_, i) => (
                        <View key={i} className={`h-1 w-1 rounded-full ${dot}`} />
                      ))}
                      {day.count > 4 && <Text className={`ml-0.5 text-[8px] font-bold ${accent === 'movie' ? 'text-blue-400' : 'text-purple-400'}`}>+{day.count - 4}</Text>}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
