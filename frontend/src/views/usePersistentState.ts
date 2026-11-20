import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** 同步到 localStorage 的 state，可选校验器用于拒绝旧版本或坏数据 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  isValid?: (value: unknown) => value is T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      // 本地缓存可能来自旧版本或被手动改坏，校验不通过时回落到默认值
      if (isValid && !isValid(parsed)) return defaultValue;
      return parsed as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota errors
    }
  }, [key, value]);

  return [value, setValue];
}
