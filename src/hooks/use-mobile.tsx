import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function isMobileDevice(userAgent: string, maxTouchPoints = 0) {
  return (
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(
      userAgent,
    ) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  );
}

export function useIsMobileDevice() {
  const [isMobileDeviceValue, setIsMobileDeviceValue] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    setIsMobileDeviceValue(
      isMobileDevice(window.navigator.userAgent, window.navigator.maxTouchPoints),
    );
  }, []);

  return isMobileDeviceValue;
}
