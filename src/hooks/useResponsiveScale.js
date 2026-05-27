import { useEffect } from "react";

const useResponsiveScale = (baseWidth = 1600, baseHeight = 900) => {
  useEffect(() => {
    const electronInvoke = window?.electronAPI?.invoke;
    if (typeof electronInvoke !== "function") return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;

    const isRetinaLike = ratio > 1.5;

    // En Full HD o mayor, no escales,
    // excepto pantallas Retina/Mac donde visualmente se ve más pequeño.
    if (width >= 1920 && height >= 900 && !isRetinaLike) {
      electronInvoke("reset-zoom").catch(() => {});
      return;
    }

    electronInvoke("configure-zoom", {
      baseWidth,
      baseHeight,
      minZoom: 0.9,
      maxZoom: isRetinaLike ? 1.18 : 1.1,
    }).catch(() => {});

    return () => {
      electronInvoke("reset-zoom").catch(() => {});
    };
  }, [baseWidth, baseHeight]);
};

export default useResponsiveScale;