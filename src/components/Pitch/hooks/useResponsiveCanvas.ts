import { useState, useEffect, useRef } from "react";

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const useResponsiveCanvas = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [canvasDimensions, setCanvasDimensions] = useState<CanvasDimensions>({
    width: 800,
    height: 280,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (!canvasContainerRef.current) return;

      // Extract layout bounds from container element wrapper
      const { clientWidth, clientHeight } = canvasContainerRef.current;

      setCanvasDimensions({
        width: clientWidth || 800,
        height: clientHeight || 280,
      });
    };

    // Run layout evaluation on initial mount loop
    updateDimensions();

    // Use ResizeObserver for sub-pixel accuracy tracking
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current);
    }

    // Window fallback tracker for older engines
    window.addEventListener("resize", updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  return {
    canvasContainerRef,
    canvasRef,
    canvasDimensions,
  };
};
