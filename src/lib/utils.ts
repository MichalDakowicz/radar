import { type ClassValue, clsx } from 'clsx';
import type { useRouter } from 'expo-router';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Deep-linked/direct-nav screens (edit, detail) have no back history - fall
// back to the main tab instead of a no-op back().
export function goBackOrHome(router: ReturnType<typeof useRouter>): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function formatRelativeTime(timestamp: string | number | null | undefined): string | null {
  if (!timestamp) return null;

  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = Date.now() - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(time).toLocaleDateString();
}

type DirectorLike = string | { name?: string | null } | null | undefined;

export function directorToDisplayString(director: DirectorLike | DirectorLike[]): string {
  if (director == null) return '';
  if (Array.isArray(director)) {
    return director
      .map((d) => (typeof d === 'object' && d !== null ? d.name ?? '' : typeof d === 'string' ? d : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof director === 'object') return director.name ?? '';
  return director;
}
