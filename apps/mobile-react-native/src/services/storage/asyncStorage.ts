import AsyncStorage from '@react-native-async-storage/async-storage';

/** Small JSON helpers over AsyncStorage for non-sensitive data. */
export const jsonStorage = {
  async read<T>(key: string, isValid: (value: unknown) => value is T): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  write: (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)),
  remove: (key: string) => AsyncStorage.removeItem(key),
};
