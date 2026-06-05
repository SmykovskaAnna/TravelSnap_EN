import { useCallback, useEffect, useMemo, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string, init?: RequestInit): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize headers so the dependency array stays stable across renders
  const headersKey = useMemo(
    () => JSON.stringify(init?.headers ?? {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(init?.headers ?? {})]
  );

  const fetchData = useCallback(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(url, init)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // headersKey instead of init to avoid new object on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, headersKey]);

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
