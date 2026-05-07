"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";

type Props = {
  date: Date;
  prefix?: string;
};

export default function RelativeTime({ date, prefix = "" }: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    // Re-render every 15s so "5s ago" becomes "20s ago" etc.
    const interval = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      {prefix}
      {formatDistanceToNowStrict(date, { addSuffix: true })}
    </span>
  );
}