import { useEffect, useState } from 'react';

import { useSearchBrowse } from '@/hooks/useTmdb';

import type { BrowseResultFilter } from './BrowseResultFilterSheet';

const RESULT_TYPE: Record<Exclude<BrowseResultFilter, 'All'>, string> = {
  Movies: 'movie',
  TV: 'tv',
  People: 'person',
  Genres: 'genre',
};

// Debounced universal search + result-type filter (doc 03 Browse, 500ms per
// legacy). Search text is ephemeral UI state (doc 05), not persisted.
export function useBrowseSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [resultFilter, setResultFilter] = useState<BrowseResultFilter>('All');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useSearchBrowse(debounced);
  const filtered = resultFilter === 'All' ? results : results.filter((r) => r.resultType === RESULT_TYPE[resultFilter]);

  return {
    query,
    setQuery,
    isSearching: query.trim().length > 0,
    isLoading,
    results: filtered,
    resultFilter,
    setResultFilter,
  };
}
