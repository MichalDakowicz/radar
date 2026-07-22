import { createContext, useContext, useState } from 'react';

// Stub for Phase 0's provider stack. Full background metadata-refresh with
// progress lands in Phase 9 (doc 03) — port of RefreshMetadataContext.jsx.
type RefreshMetadataContextValue = {
  refreshing: boolean;
  refresh: () => Promise<void>;
};

const RefreshMetadataContext = createContext<RefreshMetadataContextValue>({
  refreshing: false,
  refresh: async () => {},
});

export function RefreshMetadataProvider({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshing(false);
  };

  return (
    <RefreshMetadataContext.Provider value={{ refreshing, refresh }}>
      {children}
    </RefreshMetadataContext.Provider>
  );
}

export function useRefreshMetadata() {
  return useContext(RefreshMetadataContext);
}
