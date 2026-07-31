// Genre name -> icon key. Kept as a pure string mapping (rather than reaching
// straight for components) so it stays testable and so TMDB's movie and TV
// genre lists, which name overlapping things differently ("Sci-Fi & Fantasy"
// vs "Science Fiction"), can be folded onto the same handful of icons.

export type GenreIconKey =
  | 'action'
  | 'adventure'
  | 'animation'
  | 'comedy'
  | 'crime'
  | 'documentary'
  | 'drama'
  | 'family'
  | 'fantasy'
  | 'history'
  | 'horror'
  | 'kids'
  | 'music'
  | 'mystery'
  | 'news'
  | 'reality'
  | 'romance'
  | 'scifi'
  | 'talk'
  | 'thriller'
  | 'war'
  | 'western'
  | 'default';

// Matched in order, so the more specific combined genres ("Action &
// Adventure", "War & Politics") win over the bare words they contain.
const RULES: { match: RegExp; key: GenreIconKey }[] = [
  { match: /sci-?fi|science fiction/, key: 'scifi' },
  { match: /action/, key: 'action' },
  { match: /adventure/, key: 'adventure' },
  { match: /animation|anime/, key: 'animation' },
  { match: /comedy/, key: 'comedy' },
  { match: /crime/, key: 'crime' },
  { match: /documentary/, key: 'documentary' },
  { match: /war|politics/, key: 'war' },
  { match: /western/, key: 'western' },
  { match: /horror/, key: 'horror' },
  { match: /thriller/, key: 'thriller' },
  { match: /myster/, key: 'mystery' },
  { match: /roman|soap/, key: 'romance' },
  { match: /fantasy/, key: 'fantasy' },
  { match: /histor/, key: 'history' },
  { match: /music/, key: 'music' },
  { match: /kids/, key: 'kids' },
  { match: /family/, key: 'family' },
  { match: /news/, key: 'news' },
  { match: /reality/, key: 'reality' },
  { match: /talk/, key: 'talk' },
  { match: /drama/, key: 'drama' },
];

export function genreIconKey(genre: string): GenreIconKey {
  const name = genre.trim().toLowerCase();
  return RULES.find((rule) => rule.match.test(name))?.key ?? 'default';
}
