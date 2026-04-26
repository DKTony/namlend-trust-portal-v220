import * as React from 'react';

export type AdaptiveWidthClass = 'compact' | 'medium' | 'expanded' | 'wide';

export interface AdaptiveLayoutState {
  width: number;
  height: number;
  widthClass: AdaptiveWidthClass;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isWide: boolean;
  isCompactHeight: boolean;
  isTouch: boolean;
  canHover: boolean;
}

const getWidthClass = (width: number): AdaptiveWidthClass => {
  if (width < 640) return 'compact';
  if (width < 1024) return 'medium';
  if (width < 1440) return 'expanded';
  return 'wide';
};

const getSnapshot = (): AdaptiveLayoutState => {
  if (typeof window === 'undefined') {
    return {
      width: 1280,
      height: 800,
      widthClass: 'expanded',
      isCompact: false,
      isMedium: false,
      isExpanded: true,
      isWide: false,
      isCompactHeight: false,
      isTouch: false,
      canHover: true,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const widthClass = getWidthClass(width);
  const canHover = window.matchMedia('(hover: hover)').matches;
  const isTouch =
    window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;

  return {
    width,
    height,
    widthClass,
    isCompact: widthClass === 'compact',
    isMedium: widthClass === 'medium',
    isExpanded: widthClass === 'expanded',
    isWide: widthClass === 'wide',
    isCompactHeight: height < 700,
    isTouch,
    canHover,
  };
};

export function useAdaptiveLayout() {
  const [state, setState] = React.useState<AdaptiveLayoutState>(getSnapshot);

  React.useEffect(() => {
    const update = () => setState(getSnapshot());
    const mediaQueries = [
      window.matchMedia('(hover: hover)'),
      window.matchMedia('(hover: none)'),
      window.matchMedia('(pointer: coarse)'),
    ];

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    mediaQueries.forEach((query) => query.addEventListener('change', update));

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mediaQueries.forEach((query) => query.removeEventListener('change', update));
    };
  }, []);

  return state;
}
