import { useCallback, useEffect, useRef, useState } from 'react';
import { addAttempt, loadAttempts, storeAttempts, type Attempt } from '../storage/history';

export function useHistory() {
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts());
  const loaded = useRef(attempts);

  useEffect(() => {
    if (attempts !== loaded.current) storeAttempts(attempts);
  }, [attempts]);

  const add = useCallback((attempt: Attempt) => setAttempts((list) => addAttempt(list, attempt)), []);
  const clear = useCallback(() => setAttempts([]), []);

  return { attempts, add, clear };
}
