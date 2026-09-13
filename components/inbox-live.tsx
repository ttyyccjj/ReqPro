"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type InboxLiveValue = {
  count: number;
  tick: number;
};

const InboxLiveContext = createContext<InboxLiveValue | null>(null);

export function InboxLiveProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 1000;
    let cancelled = false;
    let skipHello = true;

    const connect = () => {
      if (cancelled) return;
      skipHello = true;
      source = new EventSource("/api/inbox/stream");
      source.onmessage = (event) => {
        delay = 1000;
        try {
          const payload = JSON.parse(event.data) as { count?: unknown };
          if (typeof payload.count === "number" && Number.isFinite(payload.count)) {
            setCount(Math.max(0, Math.floor(payload.count)));
          }
        } catch {
          return;
        }
        if (skipHello) {
          skipHello = false;
          return;
        }
        setTick((value) => value + 1);
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (cancelled) return;
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      source?.close();
      if (retry) clearTimeout(retry);
    };
  }, []);

  const value = useMemo(() => ({ count, tick }), [count, tick]);

  return (
    <InboxLiveContext.Provider value={value}>{children}</InboxLiveContext.Provider>
  );
}

export function useInboxLive() {
  const value = useContext(InboxLiveContext);
  if (!value) {
    throw new Error("Inbox live updates must wrap the signed-in app.");
  }
  return value;
}

export function LiveRefresh() {
  const { tick } = useInboxLive();
  const router = useRouter();
  const primed = useRef(false);

  useEffect(() => {
    if (!primed.current) {
      primed.current = true;
      return;
    }
    router.refresh();
  }, [tick, router]);

  return null;
}
