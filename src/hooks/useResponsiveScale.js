import { useEffect } from "react";

const useResponsiveScale = (baseWidth = 1600, baseHeight = 900) => {
  useEffect(() => {
    const electronInvoke = window?.electronAPI?.invoke;
    if (typeof electronInvoke !== "function") return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // En Full HD o mayor, no escales
    if (width >= 1920 && height >= 900) {
      electronInvoke("reset-zoom").catch(() => {});
      return;
    }

    electronInvoke("configure-zoom", { baseWidth, baseHeight }).catch(() => {});

    return () => {
      electronInvoke("reset-zoom").catch(() => {});
    };
  }, [baseWidth, baseHeight]);
};

export default useResponsiveScale;