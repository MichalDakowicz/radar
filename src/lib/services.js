
export const SERVICE_CONFIG = {
  'Netflix': { color: 'bg-red-600 text-white', short: 'N' },
  'Prime Video': { color: 'bg-blue-500 text-white', short: 'P' }, // Prime is sky blue usually
  'Disney+': { color: 'bg-blue-900 text-white', short: 'D+' },
  'Hulu': { color: 'bg-green-500 text-black', short: 'H' }, // Bright green
  'Max': { color: 'bg-purple-600 text-white', short: 'M' },
  'Apple TV+': { color: 'bg-neutral-200 text-black', short: 'A+' },
  'Peacock': { color: 'bg-yellow-400 text-black', short: 'Pc' },
  'Paramount+': { color: 'bg-blue-700 text-white', short: 'P+' },
};

export const getServiceStyle = (name) => {
    return SERVICE_CONFIG[name] || { color: 'bg-neutral-700 text-white', short: name?.substring(0,2) || '?' };
};
