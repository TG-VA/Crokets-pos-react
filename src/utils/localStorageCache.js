// Cache opcional en localStorage: nunca lanza si el almacenamiento no esta disponible.
export const getCachedValue = (key) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setCachedValue = (key, value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // El caché es opcional.
  }
};
