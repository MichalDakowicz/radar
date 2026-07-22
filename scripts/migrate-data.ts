/// <reference types="node" />
// One-time RTDB (Firebase) -> Supabase data migration (doc 11 §data-migration).
//
// Reads the exported RTDB JSON tree (rewrite/*.json) and writes profile,
// settings, movies, and activity rows for one target Supabase auth user.
// Firebase UIDs are not Supabase UUIDs, so the script never invents/creates
// auth users — it maps the RTDB account with the most movies (the real
// account, per doc 11) onto an *existing* Supabase auth user you identify by
// --target-email or --target-uid.
//
// Usage:
//   node --env-file=.env --import tsx scripts/migrate-data.ts --target-email=you@example.com [--dry-run] [--force]
//   npm run migrate:data -- --target-email=you@example.com --dry-run
//
// Flags:
//   --file=<path>          RTDB export JSON (default: rewrite/radar-watchlist-default-rtdb-export.json)
//   --source-uid=<uid>     Firebase uid to migrate (default: the uid with the most movies)
//   --target-uid=<uuid>    Supabase auth user id to migrate into
//   --target-email=<email> Look up the Supabase auth user id by email instead
//   --dry-run              Print the plan and validation warnings, write nothing
//   --force                Delete this user's existing movies/activity rows first (re-run safety)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { migrateStatus } from '../src/lib/movieStatus';
import { normalizeServiceName } from '../src/lib/services';
import { stripUndefined } from '../src/lib/stripUndefined';

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [key, ...rest] = raw.slice(2).split('=');
    out[key] = rest.length ? rest.join('=') : true;
  }
  return out;
}

function toIso(ms: unknown): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizeType(raw: unknown): 'movie' | 'tv' {
  return raw === 'tv' || raw === 'TV Show' ? 'tv' : 'movie';
}

function normalizeAvailability(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const name of raw) {
    const normalized = normalizeServiceName(typeof name === 'string' ? name : null);
    if (normalized) out.add(normalized);
  }
  return [...out];
}

// RTDB movie node -> public.movies insert row. `id` is generated here (not by
// Postgres) so activity rows can reference it before the movie is inserted.
function buildMovieRow(fbId: string, m: any, userId: string, id: string) {
  const statusFlags = migrateStatus({
    inWatchlist: m.inWatchlist,
    inProgress: m.inProgress,
    watched: m.watched,
    status: m.status ?? undefined,
    timesWatched: m.timesWatched,
    type: normalizeType(m.type),
    number_of_episodes: m.number_of_episodes ?? undefined,
    episodesWatched: m.episodesWatched ?? undefined,
  });

  return stripUndefined({
    id,
    user_id: userId,
    tmdb_id: m.tmdbId ?? null,
    imdb_id: m.imdbId ?? null,
    type: normalizeType(m.type),
    title: m.title || 'Untitled',
    release_date: m.releaseDate || null,
    cover_url: m.coverUrl ?? null,
    overview: m.overview ?? '',
    runtime: m.runtime ?? null,
    vote_average: m.voteAverage ?? null,
    vote_count: m.voteCount ?? null,
    in_watchlist: statusFlags.inWatchlist,
    in_progress: statusFlags.inProgress,
    watched: statusFlags.watched,
    times_watched: m.timesWatched ?? 0,
    status: m.status ?? null,
    completed_at: toIso(m.completedAt),
    last_watched_position: m.lastWatchedPosition || null,
    custom_order: m.customOrder ?? null,
    notes: m.notes ?? '',
    url: m.url ?? '',
    availability: normalizeAvailability(m.availability),
    director: m.director ?? [],
    cast_members: m.cast ?? [],
    genres: m.genres ?? [],
    production_companies: m.productionCompanies ?? [],
    ratings: m.ratings ?? {},
    number_of_seasons: m.number_of_seasons ?? null,
    number_of_episodes: m.number_of_episodes ?? null,
    episodes_watched: m.episodesWatched ?? {},
    episode_watch_dates: m.episodeWatchDates ?? {},
    season_episode_counts: m.seasonEpisodeCounts ?? {},
    tmdb_status: m.tmdbStatus ?? null,
    tagline: m.tagline ?? '',
    budget: m.budget ?? null,
    revenue: m.revenue ?? null,
    added_at: toIso(m.addedAt) ?? new Date().toISOString(),
    updated_at: toIso(m.updatedAt) ?? toIso(m.addedAt) ?? new Date().toISOString(),
    _fbId: fbId, // stripped before insert, kept for logging only
  });
}

function buildActivityRow(a: any, userId: string, movieIdMap: Map<string, string>) {
  const { movieId, movieTitle, timestamp, type, mediaType, ...rest } = a;
  return {
    user_id: userId,
    movie_id: movieId ? (movieIdMap.get(movieId) ?? null) : null,
    movie_title: movieTitle ?? null,
    type: type || 'updated',
    media_type: mediaType === 'movie' || mediaType === 'tv' ? mediaType : null,
    details: stripUndefined(rest),
    created_at: toIso(timestamp) ?? new Date().toISOString(),
  };
}

async function chunkedInsert(supabase: any, table: string, rows: any[], chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`insert into ${table} failed at rows ${i}-${i + chunk.length}: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);
  const force = Boolean(args.force);

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (run with node --env-file=.env).');
  }
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const filePath = (args.file as string) || 'rewrite/radar-watchlist-default-rtdb-export.json';
  const dump = JSON.parse(readFileSync(filePath, 'utf8'));
  const users = dump.users || {};
  const uids = Object.keys(users);
  if (uids.length === 0) throw new Error(`No users found in ${filePath}`);

  const sourceUid =
    (args['source-uid'] as string) ||
    uids.reduce((best, uid) => {
      const count = Object.keys(users[uid].movies || {}).length;
      const bestCount = Object.keys(users[best]?.movies || {}).length;
      return count > bestCount ? uid : best;
    }, uids[0]);

  const source = users[sourceUid];
  if (!source) throw new Error(`Source uid ${sourceUid} not found in ${filePath}`);

  // Resolve the target Supabase auth user — never create one (doc 11: emails
  // aren't in the RTDB export, and the account already exists from Google/email
  // sign-in in the app).
  let targetUid = args['target-uid'] as string | undefined;
  if (!targetUid) {
    const targetEmail = (args['target-email'] as string | undefined)?.toLowerCase();
    const { data: list, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    if (targetEmail) {
      const match = list.users.find((u: any) => u.email?.toLowerCase() === targetEmail);
      if (!match) throw new Error(`No Supabase auth user with email ${targetEmail}`);
      targetUid = match.id;
    } else if (list.users.length === 1) {
      targetUid = list.users[0].id;
    } else {
      throw new Error(
        `${list.users.length} Supabase auth users exist — pass --target-email=<email> or --target-uid=<uuid>.\n` +
          list.users.map((u: any) => `  ${u.id}  ${u.email}`).join('\n'),
      );
    }
  }

  const movieEntries = Object.entries<any>(source.movies || {});
  const corrupt = movieEntries.filter(([, m]) => !m.title && !m.tmdbId);
  const validMovieEntries = movieEntries.filter(([, m]) => m.title || m.tmdbId);
  const movieIdMap = new Map<string, string>();
  const movieRows = validMovieEntries.map(([fbId, m]) => {
    const id = crypto.randomUUID();
    movieIdMap.set(fbId, id);
    const row = buildMovieRow(fbId, m, targetUid!, id);
    delete (row as any)._fbId;
    return row;
  });

  const activityEntries = Object.entries<any>(source.activity || {});
  const activityRows = activityEntries.map(([, a]) => buildActivityRow(a, targetUid!, movieIdMap));

  const settings = source.settings || {};
  const settingsRow = stripUndefined({
    user_id: targetUid,
    watch_provider_country: settings.watchProviderCountry ?? undefined,
    recently_added_days: settings.recentlyAddedDays ?? undefined,
    show_recently_added: settings.showRecentlyAddedSection ?? undefined,
    friends_visibility: settings.privacy?.friendsVisibility ?? undefined,
    streak_threshold: settings.stats?.streakThreshold ?? undefined,
    tv_streak_threshold: settings.stats?.tvStreakThreshold ?? undefined,
    theme: settings.theme ?? undefined,
  });

  const profile = source.profile || {};
  const profileRow = stripUndefined({
    id: targetUid,
    username: profile.username ?? undefined,
    display_name: profile.displayName ?? undefined,
    pfp: profile.pfp ?? undefined,
  });

  console.log(`Source RTDB uid: ${sourceUid} (${uids.length} total users in export)`);
  console.log(`Target Supabase user: ${targetUid}`);
  console.log(`Movies: ${movieRows.length} to import, ${corrupt.length} corrupt/skipped (no title or tmdbId)`);
  if (corrupt.length) console.log('  skipped keys:', corrupt.map(([fbId]) => fbId).join(', '));
  console.log(`Activity: ${activityRows.length} to import`);
  console.log(`Profile fields: ${Object.keys(profileRow).filter((k) => k !== 'id').join(', ') || '(none)'}`);
  if (typeof profileRow.pfp === 'string' && profileRow.pfp.length > 200_000) {
    console.log(`  warning: pfp is ${(profileRow.pfp.length / 1024).toFixed(0)}KB (base64) — importing as-is`);
  }
  console.log(`Settings fields: ${Object.keys(settingsRow).filter((k) => k !== 'user_id').join(', ') || '(none)'}`);

  const friendUids: string[] = Object.keys(source.friends || {});
  if (friendUids.length) {
    console.log(`Friends: ${friendUids.length} in RTDB — skipped (no Supabase mapping for friend uids; link manually after they migrate too)`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no writes performed.');
    return;
  }

  const { count: existingCount, error: countError } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', targetUid);
  if (countError) throw new Error(`checking existing movies failed: ${countError.message}`);

  if (existingCount && existingCount > 0) {
    if (!force) {
      throw new Error(
        `Target user already has ${existingCount} movies. Re-run with --force to delete them and re-import, or pick a different --target-uid.`,
      );
    }
    console.log(`--force: deleting ${existingCount} existing movies + their activity for target user...`);
    const { error: delActivityError } = await supabase.from('activity').delete().eq('user_id', targetUid);
    if (delActivityError) throw new Error(`delete activity failed: ${delActivityError.message}`);
    const { error: delMoviesError } = await supabase.from('movies').delete().eq('user_id', targetUid);
    if (delMoviesError) throw new Error(`delete movies failed: ${delMoviesError.message}`);
  }

  if (Object.keys(profileRow).length > 1) {
    const { error } = await supabase.from('profiles').upsert(profileRow, { onConflict: 'id' });
    if (error) throw new Error(`profile upsert failed: ${error.message}`);
  }
  if (Object.keys(settingsRow).length > 1) {
    const { error } = await supabase.from('user_settings').upsert(settingsRow, { onConflict: 'user_id' });
    if (error) throw new Error(`settings upsert failed: ${error.message}`);
  }

  console.log(`Inserting ${movieRows.length} movies...`);
  await chunkedInsert(supabase, 'movies', movieRows);
  console.log(`Inserting ${activityRows.length} activity rows...`);
  await chunkedInsert(supabase, 'activity', activityRows);

  console.log('\nDone. Verify row counts and spot-check a few titles in the app.');
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
