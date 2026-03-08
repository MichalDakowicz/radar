import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return null;
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Normalize director (string, string[], or { id, name }[]) to a display string.
 * TMDB and DB may store director as objects; display must be text.
 */
export function directorToDisplayString(director) {
  if (director == null) return "";
  if (Array.isArray(director)) {
    const names = director.map((d) =>
      typeof d === "object" && d !== null && d.name != null
        ? d.name
        : typeof d === "string"
          ? d
          : "",
    );
    return names.filter(Boolean).join(", ");
  }
  if (typeof director === "object" && director.name != null) return director.name;
  return typeof director === "string" ? director : "";
}
