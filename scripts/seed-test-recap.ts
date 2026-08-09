// Writes one yearly recap into public.recaps so the nine-page annual report can
// be opened before a real year has finished.
//
// Why it has to be seeded: a recap is only published once its period ends
// (lib/recapPeriod isPeriodClosed), and an account whose whole watch history sits
// inside the current year therefore has no report to open until 1 January. This
// takes that account's real library, shifts its watch dates back into the target
// year, and stores the result under that year's key.
//
// The payload is real derivation over real titles — the only fiction is *when*
// they were watched. Nothing in public.movies is touched: the single row written
// is a derived-cache row in public.recaps, and --remove deletes it again.
//
// Usage:
//   node --env-file=.env --import tsx scripts/seed-test-recap.ts --user=<username>
//   node --env-file=.env --import tsx scripts/seed-test-recap.ts --user=<username> --remove
//
// Flags:
//   --user=<username>   profiles.username to seed for (required)
//   --year=<YYYY>       target year (default: last year)
//   --dry-run           print the summary, write nothing
//   --remove            delete the stored recap for that year and exit

import { createClient } from '@supabase/supabase-js';

import { normalizeMovie, type MovieRow } from '../src/lib/normalizeMovie';
import { personalScore } from '../src/lib/personalScore';
import { buildYearlyRecap } from '../src/lib/recapBuild';
import type { Movie } from '../src/types/movie';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'] as const;
  }),
);

const username = args.get('user');
const targetYear = Number(args.get('year') ?? new Date().getFullYear() - 1);
const dryRun = args.has('dry-run');
const remove = args.has('remove');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!username) fail('pass --user=<username>');
if (!url || !serviceKey) fail('EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (node --env-file=.env)');
if (!Number.isInteger(targetYear)) fail(`--year must be a four digit year, got "${args.get('year')}"`);

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Same date arithmetic in both directions, on a local-time Date. */
function shiftYears(iso: string, by: number): string {
  const date = new Date(iso);
  date.setFullYear(date.getFullYear() - by);
  return date.toISOString();
}

/** The most recent year the library actually has watch activity in. */
function newestActiveYear(movies: Movie[]): number | null {
  let newest: number | null = null;
  for (const movie of movies) {
    const stamps = [movie.completedAt, ...Object.values(movie.episodeWatchDates || {})];
    for (const stamp of stamps) {
      if (!stamp) continue;
      const year = new Date(stamp).getFullYear();
      if (Number.isFinite(year) && (newest === null || year > newest)) newest = year;
    }
  }
  return newest;
}

/** Every watch timestamp moved back `by` years; everything else left alone. */
function shiftLibrary(movies: Movie[], by: number): Movie[] {
  return movies.map((movie) => ({
    ...movie,
    completedAt: movie.completedAt ? shiftYears(movie.completedAt, by) : null,
    episodeWatchDates: Object.fromEntries(
      Object.entries(movie.episodeWatchDates || {}).map(([key, stamp]) => [key, shiftYears(stamp, by)]),
    ),
  }));
}

async function main() {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .maybeSingle();
  if (profileError) fail(profileError.message);
  if (!profile) fail(`no profile with username "${username}"`);

  const userId = (profile as { id: string }).id;

  if (remove) {
    if (dryRun) {
      console.log(`would delete the ${targetYear} recap for @${username}`);
      return;
    }
    const { error } = await supabase
      .from('recaps')
      .delete()
      .eq('user_id', userId)
      .eq('kind', 'year')
      .eq('period_key', String(targetYear));
    if (error) fail(error.message);
    console.log(`✓ removed the ${targetYear} recap for @${username}`);
    return;
  }

  const { data: rows, error: moviesError } = await supabase.from('movies').select('*').eq('user_id', userId);
  if (moviesError) fail(moviesError.message);

  const movies = (rows as MovieRow[]).map(normalizeMovie);
  if (movies.length === 0) fail(`@${username} has no titles to build a recap from`);

  const source = newestActiveYear(movies);
  if (source === null) fail(`@${username} has no watch activity to shift`);

  const offset = source - targetYear;
  if (offset < 0) fail(`${targetYear} is after the newest activity (${source}); pick an earlier --year`);
  const shifted = offset === 0 ? movies : shiftLibrary(movies, offset);

  const recap = buildYearlyRecap(String(targetYear), { movies: shifted, score: personalScore });

  console.log(`@${username} · ${movies.length} titles in the library`);
  console.log(`  source year ${source} → target ${targetYear} (shifted back ${offset})`);
  console.log(
    `  ${recap.titles} finished · ${recap.hours}h · ${recap.activeDays} active days · streak ${recap.longestStreak}`,
  );
  console.log(`  top genre ${recap.genres[0]?.name ?? '—'} · top director ${recap.directors.find((d) => d.place === 1)?.name ?? '—'}`);
  console.log(`  ${recap.masterpieces.length} perfect scores · ${recap.classification.name}`);

  if (dryRun) {
    console.log('dry run — nothing written');
    return;
  }

  const { error } = await supabase.from('recaps').upsert(
    {
      user_id: userId,
      kind: 'year',
      period_key: String(targetYear),
      payload: recap,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,kind,period_key' },
  );
  if (error) fail(error.message);

  console.log(`✓ stored the ${targetYear} annual report for @${username}`);
  console.log('  it will not appear on Profile until the app is reopened');
  console.log(`  remove it with: --user=${username} --year=${targetYear} --remove`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
