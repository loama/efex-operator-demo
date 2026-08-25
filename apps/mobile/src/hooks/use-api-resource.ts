import { useCallback, useEffect, useState } from "react";

export function useApiResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await loader());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    let active = true;
    loader()
      .then((value) => { if (active) setData(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Error desconocido"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loader]);
  return { data, error, loading, reload };
}
