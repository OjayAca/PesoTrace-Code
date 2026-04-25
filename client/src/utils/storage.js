function resolveStorage(storage) {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStorageValue(key, fallback = "", storage) {
  const target = resolveStorage(storage);

  if (!target) {
    return fallback;
  }

  try {
    return target.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageValue(key, value, storage) {
  const target = resolveStorage(storage);

  if (!target) {
    return;
  }

  try {
    target.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

export function removeStorageValue(key, storage) {
  const target = resolveStorage(storage);

  if (!target) {
    return;
  }

  try {
    target.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
