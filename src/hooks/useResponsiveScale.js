import { useEffect } from "react";

const useResponsiveScale = (baseWidth = 1600, baseHeight = 900) => {
  useEffect(() => {
    const electronInvoke = window?.electronAPI?.invoke;
    if (typeof electronInvoke !== "function") return;

    let cancelled = false;
    const timers = [];

    const applyZoom = async () => {
      if (cancelled) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      const physicalWidth = Math.round(width * dpr);
      const physicalHeight = Math.round(height * dpr);

      if (!width || !height) return;

      // Si la pantalla física es Full HD o mayor, NO escalar
      if (physicalWidth >= 1920 && physicalHeight >= 1080) {
        await electronInvoke("reset-zoom").catch(() => {});
        return;
      }

      await electronInvoke("configure-zoom", {
        baseWidth,
        baseHeight,
      }).catch(() => {});
    };

    timers.push(setTimeout(applyZoom, 150));
    timers.push(setTimeout(applyZoom, 500));
    timers.push(setTimeout(applyZoom, 1000));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [baseWidth, baseHeight]);
};

export default useResponsiveScale;