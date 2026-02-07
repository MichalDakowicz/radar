
export const SERVICE_CONFIG = {
  'Netflix': { color: 'bg-red-600 text-white', short: 'N' },
  'Prime Video': { color: 'bg-blue-500 text-white', short: 'P' }, // Prime is sky blue usually
  'Disney+': { color: 'bg-blue-900 text-white', short: 'D+' },
  'Hulu': { color: 'bg-green-500 text-black', short: 'H' }, // Bright green
  'Max': { color: 'bg-purple-600 text-white', short: 'M' },
  'Apple TV+': { color: 'bg-neutral-200 text-black', short: 'A+' },
  'Peacock': { color: 'bg-yellow-400 text-black', short: 'Pc' },
  'Paramount+': { color: 'bg-blue-700 text-white', short: 'P+' },
  'Fubo': { color: 'bg-orange-500 text-white', short: 'Fu' },
};

export const normalizeServiceName = (name) => {
  if (!name) return null;
  const n = name.toLowerCase();
  
  if (n.includes('netflix')) return 'Netflix';
  if (n.includes('prime') || n.includes('amazon')) return 'Prime Video';
  if (n.includes('disney')) return 'Disney+';
  if (n.includes('hulu')) return 'Hulu';
  if (n.includes('max') || n.includes('hbo')) return 'Max';
  if (n.includes('apple') || n.includes('itunes')) return 'Apple TV+';
  if (n.includes('peacock')) return 'Peacock';
  if (n.includes('paramount')) return 'Paramount+';
  if (n.includes('fubo')) return 'Fubo';
  
  return name;
};

export const getServiceStyle = (name) => {
    return SERVICE_CONFIG[name] || { color: 'bg-neutral-700 text-white', short: name?.substring(0,2) || '?' };
};
