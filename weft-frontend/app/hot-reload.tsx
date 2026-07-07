"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Listens to the backend's /events SSE; on YAML change the backend reloads
// its DAO and emits "reload", which we turn into a server-component refresh.
export function HotReload({ backend }: { backend: string }) {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource(`${backend}/events`);
    es.onmessage = () => router.refresh();
    return () => es.close();
  }, [backend, router]);
  return null;
}
