import { useEffect, useRef } from 'react';

const useResponsiveScale = (baseWidth = 1200, baseHeight = 1080) => {
  const configuredRef = useRef(false);

  useEffect(() => {
    const electronInvoke = window?.electronAPI?.invoke;
    if (typeof electronInvoke === 'function') {
      if (!configuredRef.current) {
        configuredRef.current = true;
        electronInvoke('configure-zoom', { baseWidth, baseHeight }).catch(() => {});
      } else {
        electronInvoke('configure-zoom', { baseWidth, baseHeight }).catch(() => {});
      }
      return () => {
        configuredRef.current = false;
        electronInvoke('reset-zoom').catch(() => {});
      };
    }

    const applyScale = () => {
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      const scale = Math.min(scaleX, scaleY);

      if (document.documentElement) document.documentElement.style.zoom = String(scale);
      if (document.body) document.body.style.zoom = String(scale);
    };

    applyScale();
    window.addEventListener('resize', applyScale);

    return () => {
      window.removeEventListener('resize', applyScale);
      if (document.documentElement) document.documentElement.style.zoom = '1';
      if (document.body) document.body.style.zoom = '1';
    };
  }, [baseWidth, baseHeight]);
};

export default useResponsiveScale;
