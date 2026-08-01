// Creates a demo Supabase account with a populated library and activity log,
// then sends a friend request from it to a real account — so the Social tab has
// something to show without waiting for a second human to log films.
//
// Titles are pulled from TMDB by id, so posters, genres, directors, runtimes and
// providers are the real thing rather than placeholders. Activity rows are
// backdated across the last ten days so the rail's "new since your last visit"
// ring, the This week digest and the relative timestamps all have real spread.
//
// Usage:
//   node --env-file=.env scripts/seed-demo-friend.mjs --target-email=you@example.com [--dry-run]
//   npm run seed:demo -- --target-email=you@example.com
//
// Flags:
//   --target-email=<email>  Account that receives the friend request (required)
//   --email=<email>         Demo account address  (default: radar.demo@radar.test)
//   --password=<pw>         Demo account password (default: radar-demo-2026)
//   --dry-run               Print the plan, write nothing
//   --reset                 Delete an existing demo account first, then rebuild
//   --report                Read-only: show what the two accounts already share
//   --no-mirror             Skip deriving titles from the target's own library
//
// Safe to re-run: without --reset it reuses the demo account and skips titles it
// has already written. It never touches the target account's own rows — the only
// thing it writes on their side is one pending friend_requests row.

import { createClient } from '@supabase/supabase-js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const DEFAULTS = { email: 'radar.demo@radar.test', password: 'radar-demo-2026' };
const DEMO_USERNAME = 'jessvarga';
const DEMO_DISPLAY_NAME = 'Jess Varga';

const DAY = 86_400_000;

// tmdbId, media type, and how the demo account has filed it. `daysAgo` drives
// both completed_at and the activity row, so the feed reads chronologically.
const LIBRARY = [
  { tmdbId: 693134, type: 'movie', state: 'rated', rating: 4.5, daysAgo: 0.02 },
  { tmdbId: 792307, type: 'movie', state: 'rated', rating: 5, daysAgo: 0.08 },
  { tmdbId: 467244, type: 'movie', state: 'rated', rating: 4.5, daysAgo: 0.6 },
  { tmdbId: 915935, type: 'movie', state: 'rated', rating: 4, daysAgo: 1.2 },
  { tmdbId: 838209, type: 'movie', state: 'watched', daysAgo: 2.1 },
  { tmdbId: 995133, type: 'movie', state: 'rated', rating: 4.5, daysAgo: 2.9 },
  { tmdbId: 152601, type: 'movie', state: 'rated', rating: 5, daysAgo: 3.4 },
  { tmdbId: 726209, type: 'movie', state: 'rated', rating: 3, daysAgo: 4.6 },
  { tmdbId: 653346, type: 'movie', state: 'watched', daysAgo: 5.5 },
  { tmdbId: 507089, type: 'movie', state: 'rated', rating: 3.5, daysAgo: 6.8 },
  { tmdbId: 1029575, type: 'movie', state: 'rated', rating: 4, daysAgo: 9 },
  { tmdbId: 496243, type: 'movie', state: 'rated', rating: 5, daysAgo: 12 },
  { tmdbId: 872585, type: 'movie', state: 'rated', rating: 4, daysAgo: 21 },
  { tmdbId: 120467, type: 'movie', state: 'rated', rating: 4.5, daysAgo: 40 },
  // Underway — drives the yellow "IN PROGRESS" badge and the shelf section.
  { tmdbId: 46648, type: 'tv', state: 'progress', daysAgo: 0.3 },
  { tmdbId: 95396, type: 'tv', state: 'progress', daysAgo: 3.1 },
  // Queued — the watchlist chip, and the overlap Watch together needs.
  { tmdbId: 1022789, type: 'movie', state: 'watchlist', daysAgo: 0.15 },
  { tmdbId: 335977, type: 'movie', state: 'watchlist', daysAgo: 1.05 },
  { tmdbId: 447273, type: 'movie', state: 'watchlist', daysAgo: 4.2 },
  { tmdbId: 616037, type: 'movie', state: 'watchlist', daysAgo: 7.5 },
  { tmdbId: 1064213, type: 'movie', state: 'watchlist', daysAgo: 11 },
];

/**
 * A fixed title list only overlaps a real library by luck, and Compare taste and
 * Watch together are both intersections — with no overlap they render their
 * empty states and there is nothing to test. So part of the demo library is
 * derived from the target's own: some of their watchlist, and some of their
 * ratings deliberately re-scored to land on both sides of the agree/split line.
 */
function mirrorPlan(targetMovies, alreadyHave) {
  const usable = (m) => m.tmdb_id != null && !alreadyHave.has(m.tmdb_id);
  const plan = [];

  const watchlist = targetMovies.filter((m) => m.in_watchlist && usable(m)).slice(0, 6);
  for (const [i, m] of watchlist.entries()) {
    plan.push({ tmdbId: m.tmdb_id, type: m.type, state: 'watchlist', daysAgo: 0.4 + i * 1.7 });
  }

  const rated = targetMovies.filter((m) => m.ratings?.overall > 0 && usable(m));
  // Alternating offsets: 0 and -0.5 land inside the half-star "agree" band,
  // -2 and +1.5 clear the "split" threshold. Both lists get populated.
  const offsets = [0, -2, -0.5, 1.5, 0, -1.5, 0.5, -2];
  for (const [i, m] of rated.slice(0, offsets.length).entries()) {
    const rating = Math.min(5, Math.max(0.5, Math.round((m.ratings.overall + offsets[i]) * 2) / 2));
    plan.push({ tmdbId: m.tmdb_id, type: m.type, state: 'rated', rating, daysAgo: 1.1 + i * 1.3 });
  }

  return plan;
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=');
    args[key] = value ?? true;
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set (run with node --env-file=.env).`);
  return value;
}

async function tmdb(path, token) {
  const res = await fetch(`${TMDB_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

/** One TMDB title, shaped for a public.movies row. */
async function fetchTitle(entry, token, region) {
  const endpoint = entry.type === 'tv' ? 'tv' : 'movie';
  const data = await tmdb(
    `${endpoint}/${entry.tmdbId}?append_to_response=credits,watch/providers`,
    token,
  );

  const credits = data.credits ?? {};
  const crew = credits.crew ?? [];
  const directors =
    entry.type === 'tv'
      ? (data.created_by ?? []).map((p) => ({ id: p.id, name: p.name }))
      : crew.filter((c) => c.job === 'Director').map((p) => ({ id: p.id, name: p.name }));

  const flatrate = data['watch/providers']?.results?.[region]?.flatrate ?? [];

  return {
    tmdb_id: entry.tmdbId,
    type: entry.type,
    title: data.title ?? data.name,
    release_date: data.release_date || data.first_air_date || null,
    cover_url: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : null,
    overview: data.overview ?? '',
    runtime: data.runtime ?? data.episode_run_time?.[0] ?? 0,
    vote_average: data.vote_average ?? 0,
    vote_count: data.vote_count ?? 0,
    tagline: data.tagline ?? '',
    budget: data.budget ?? 0,
    revenue: data.revenue ?? 0,
    number_of_seasons: data.number_of_seasons ?? null,
    number_of_episodes: data.number_of_episodes ?? null,
    tmdb_status: data.status ?? null,
    director: directors,
    cast_members: (credits.cast ?? []).slice(0, 12).map((p) => ({ id: p.id, name: p.name })),
    genres: (data.genres ?? []).map((g) => ({ id: g.id, name: g.name })),
    production_companies: (data.production_companies ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logo_path ? `${IMAGE_BASE}${c.logo_path}` : null,
    })),
    availability: flatrate.map((p) => p.provider_name),
  };
}

/** Status flags + the activity row that a given state implies. */
function stateToRow(entry, at) {
  const iso = new Date(at).toISOString();
  switch (entry.state) {
    case 'rated':
      return {
        flags: {
          in_watchlist: false,
          in_progress: false,
          watched: true,
          times_watched: 1,
          status: 'Completed',
          completed_at: iso,
          ratings: { overall: entry.rating },
        },
        activity: { type: 'rating_changed', details: { rating: entry.rating } },
      };
    case 'watched':
      return {
        flags: {
          in_watchlist: false,
          in_progress: false,
          watched: true,
          times_watched: 1,
          status: 'Completed',
          completed_at: iso,
          ratings: {},
        },
        activity: { type: 'completed', details: { timesWatched: 1 } },
      };
    case 'progress':
      return {
        flags: {
          in_watchlist: false,
          in_progress: true,
          watched: false,
          times_watched: 0,
          status: 'Watching',
          completed_at: null,
          ratings: {},
        },
        activity: { type: 'started_watching', details: {} },
      };
    default:
      return {
        flags: {
          in_watchlist: true,
          in_progress: false,
          watched: false,
          times_watched: 0,
          status: 'Watchlist',
          completed_at: null,
          ratings: {},
        },
        activity: { type: 'added_to_watchlist', details: {} },
      };
  }
}

async function resolveTargetUser(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) throw new Error(`No auth user with email ${email}. Sign in on the app once first.`);
  return found;
}

async function ensureDemoUser(supabase, { email, password, reset }) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing && reset) {
    // Cascades through profiles/movies/activity/friendships by FK.
    const { error: delError } = await supabase.auth.admin.deleteUser(existing.id);
    if (delError) throw delError;
    console.log(`  deleted existing demo account ${existing.id}`);
  } else if (existing) {
    // Re-assert the password so a forgotten one is never a reason to re-run with --reset.
    await supabase.auth.admin.updateUserById(existing.id, { password });
    console.log(`  reusing demo account ${existing.id}`);
    return existing.id;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: DEMO_DISPLAY_NAME },
  });
  if (createError) throw createError;
  console.log(`  created demo account ${created.user.id}`);
  return created.user.id;
}

/**
 * What Compare taste and Watch together will actually have to work with — both
 * are set intersections, so an empty result usually means thin libraries rather
 * than a broken screen. Worth being able to tell the two apart.
 */
async function report(supabase, demoId, targetId) {
  const cols = 'tmdb_id, type, title, ratings, in_watchlist, watched';
  const [{ data: demo }, { data: target }] = await Promise.all([
    supabase.from('movies').select(cols).eq('user_id', demoId),
    supabase.from('movies').select(cols).eq('user_id', targetId),
  ]);

  const key = (m) => (m.tmdb_id != null ? `${m.type}:${m.tmdb_id}` : `${m.type}:t:${m.title.trim().toLowerCase()}`);
  const score = (m) => (m.ratings?.overall > 0 ? m.ratings.overall : null);

  const mine = new Map((target ?? []).map((m) => [key(m), m]));
  const shared = [];
  const bothRated = [];
  for (const m of demo ?? []) {
    const other = mine.get(key(m));
    if (!other) continue;
    if (m.in_watchlist && other.in_watchlist) shared.push(m.title);
    if (score(m) != null && score(other) != null) {
      bothRated.push(`${m.title} (you ${score(other)} / demo ${score(m)})`);
    }
  }

  // Which account actually holds a library matters when picking --target-email:
  // sending the request to the wrong one puts it in an inbox nobody opens.
  const { data: everyone } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const { data: allMovies } = await supabase.from('movies').select('user_id');
  const perUser = new Map();
  for (const row of allMovies ?? []) perUser.set(row.user_id, (perUser.get(row.user_id) ?? 0) + 1);
  console.log('\naccounts:');
  for (const u of everyone?.users ?? []) {
    console.log(`  ${(perUser.get(u.id) ?? 0).toString().padStart(4)} titles  ${u.email}`);
  }

  console.log(`\nyour library: ${target?.length ?? 0} titles · demo library: ${demo?.length ?? 0}`);
  console.log(`rated by both (drives Compare taste): ${bothRated.length}`);
  for (const line of bothRated) console.log(`  ${line}`);
  console.log(`on both watchlists (drives Watch together): ${shared.length}`);
  for (const line of shared) console.log(`  ${line}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);
  const targetEmail = args['target-email'];
  if (!targetEmail || targetEmail === true) {
    throw new Error('--target-email=you@example.com is required.');
  }

  const email = args.email && args.email !== true ? args.email : DEFAULTS.email;
  const password = args.password && args.password !== true ? args.password : DEFAULTS.password;

  const supabase = createClient(requireEnv('EXPO_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const tmdbToken = requireEnv('EXPO_PUBLIC_TMDB_ACCESS_TOKEN');

  const target = await resolveTargetUser(supabase, targetEmail);
  console.log(`target: ${target.email} (${target.id})`);

  if (args.report) {
    const { data } = await supabase.from('profiles').select('id').eq('username', DEMO_USERNAME).maybeSingle();
    if (!data) throw new Error('No demo account yet — run without --report first.');
    await report(supabase, data.id, target.id);
    return;
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('watch_provider_country')
    .eq('user_id', target.id)
    .maybeSingle();
  const region = settings?.watch_provider_country ?? 'US';

  const { data: targetMovies } = await supabase
    .from('movies')
    .select('tmdb_id, type, title, ratings, in_watchlist')
    .eq('user_id', target.id);

  const fixedIds = new Set(LIBRARY.map((e) => e.tmdbId));
  const mirrored = args['no-mirror'] ? [] : mirrorPlan(targetMovies ?? [], fixedIds);
  const plan = [...LIBRARY, ...mirrored];
  if (mirrored.length > 0) {
    console.log(`mirroring ${mirrored.length} titles from the target's own library, so the`);
    console.log('  comparison screens have real overlap instead of empty states');
  }

  console.log(`fetching ${plan.length} titles from TMDB (providers for ${region})…`);
  const titles = [];
  for (const entry of plan) {
    try {
      titles.push({ entry, meta: await fetchTitle(entry, tmdbToken, region) });
    } catch (e) {
      console.warn(`  skipped tmdb ${entry.tmdbId}: ${e.message}`);
    }
  }
  console.log(`  got ${titles.length}`);

  if (dryRun) {
    for (const { entry, meta } of titles) console.log(`  ${entry.state.padEnd(9)} ${meta.title}`);
    console.log('\n--dry-run: no writes performed.');
    return;
  }

  console.log('demo account:');
  const demoId = await ensureDemoUser(supabase, { email, password, reset: Boolean(args.reset) });

  // The signup trigger already made a profile; give it a recognisable identity.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ username: DEMO_USERNAME, display_name: DEMO_DISPLAY_NAME })
    .eq('id', demoId);
  if (profileError) throw profileError;

  // 'friends' is the default and is what we want: the shelf opens up once the
  // request is accepted, which is the flow being tested.
  await supabase.from('user_settings').upsert({ user_id: demoId, friends_visibility: 'friends' });

  const { data: already } = await supabase.from('movies').select('tmdb_id').eq('user_id', demoId);
  const seen = new Set((already ?? []).map((r) => r.tmdb_id));

  const now = Date.now();
  let written = 0;
  for (const { entry, meta } of titles) {
    if (seen.has(entry.tmdbId)) continue;
    const at = now - entry.daysAgo * DAY;
    const { flags, activity } = stateToRow(entry, at);
    const iso = new Date(at).toISOString();

    const { data: inserted, error: movieError } = await supabase
      .from('movies')
      .insert({ ...meta, ...flags, user_id: demoId, added_at: iso, updated_at: iso })
      .select('id')
      .single();
    if (movieError) throw movieError;

    const { error: activityError } = await supabase.from('activity').insert({
      user_id: demoId,
      movie_id: inserted.id,
      movie_title: meta.title,
      type: activity.type,
      media_type: entry.type,
      details: { ...activity.details, mediaType: entry.type },
      created_at: iso,
    });
    if (activityError) throw activityError;
    written += 1;
  }
  console.log(`titles written: ${written}${written < titles.length ? ` (${titles.length - written} already there)` : ''}`);

  // A comment on the demo account's own activity, so the thread on a feed card
  // is populated the moment the request is accepted. Skipped when the reactions
  // schema change has not been applied yet.
  const { data: newest } = await supabase
    .from('activity')
    .select('id')
    .eq('user_id', demoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (newest) {
    const { count, error: probeError } = await supabase
      .from('activity_comments')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', newest.id);

    if (probeError) {
      console.log('reactions/comments: skipped — run supabase/schema.sql to create those tables');
    } else if (count && count > 0) {
      console.log('reactions/comments: already seeded');
    } else {
      await supabase.from('activity_comments').insert({
        activity_id: newest.id,
        user_id: demoId,
        body: 'rewatched this immediately, no regrets',
      });
      await supabase
        .from('activity_reactions')
        .upsert({ activity_id: newest.id, user_id: demoId, kind: 'fire' });
      console.log('reactions/comments: seeded one of each');
    }
  }

  const { error: requestError } = await supabase
    .from('friend_requests')
    .upsert({ sender_id: demoId, recipient_id: target.id, status: 'pending' });
  if (requestError) throw requestError;

  console.log('\nfriend request sent.');
  console.log(`  sign in as   ${email} / ${password}`);
  console.log(`  or accept it on ${target.email} — Social › the bell`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
