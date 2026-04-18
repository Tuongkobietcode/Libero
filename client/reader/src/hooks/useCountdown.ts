import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

function getRemainingMs(target?: string | null): number {
  if (!target) {
    return 0;
  }

  const diff = dayjs(target).diff(dayjs());
  return diff > 0 ? diff : 0;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    return 'Da het han';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days} ngay ${remainHours} gio`;
  }

  return `${hours} gio ${minutes} phut`;
}

export function useCountdown(target?: string | null) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(target));

  useEffect(() => {
    setRemainingMs(getRemainingMs(target));

    if (!target) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingMs(getRemainingMs(target));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [target]);

  return useMemo(
    () => ({
      remainingMs,
      isExpired: remainingMs <= 0,
      label: formatRemaining(remainingMs),
    }),
    [remainingMs],
  );
}
