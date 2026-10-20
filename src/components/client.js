"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { newerSnapshot, retryDelay } from "@/lib/client-state";

export async function api(path, options = {}) {
  const controller = new AbortController();
  const forward = () => controller.abort();
  options.signal?.addEventListener("abort", forward, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(
        data?.error || data?.message || `Request failed (${response.status}).`,
      );
      error.status = response.status;
      throw error;
    }
    if (!data) throw new Error("The server returned an incomplete response.");
    return data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(
        "The request did not finish. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forward);
  }
}
export function useResource(path) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const sequence = useRef(0);
  const pending = useRef(null);
  const reload = useCallback(async () => {
    if (!path) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const id = ++sequence.current;
    setState((old) => ({ ...old, loading: true, error: "" }));
    try {
      const data = await api(path, { signal: controller.signal });
      if (id === sequence.current)
        setState({ data, error: "", loading: false });
      return data;
    } catch (error) {
      if (id === sequence.current)
        setState((old) => ({ ...old, error: error.message, loading: false }));
      throw error;
    }
  }, [path]);
  useEffect(() => {
    setState({ data: null, error: "", loading: Boolean(path) });
    if (path) reload().catch(() => {});
    return () => {
      ++sequence.current;
      pending.current?.abort();
    };
  }, [path, reload]);
  return { ...state, reload };
}
export function useLiveResults() {
  const [state, setState] = useState({
    data: null,
    status: "connecting",
    error: "",
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false,
      timer,
      controller,
      failures = 0,
      generation = 0,
      pending = false,
      forbidden = false;
    const poll = async () => {
      if (disposed || document.hidden || pending) return;
      pending = true;
      const id = ++generation;
      controller = new AbortController();
      try {
        const snapshot = await api("/api/results/live", {
          signal: controller.signal,
        });
        // Validate before entering React's state updater, where thrown errors cannot be caught here.
        newerSnapshot(null, snapshot);
        if (disposed || id !== generation) return;
        failures = 0;
        setState((old) => ({
          data: newerSnapshot(old.data, snapshot),
          status: "live",
          error: "",
        }));
      } catch (error) {
        if (disposed || id !== generation) return;
        failures++;
        setState((old) => ({
          ...old,
          status: error.status === 401 ? "signed-out" : "reconnecting",
          error: error.message,
        }));
        if (error.status === 401 || error.status === 403) {
          forbidden = true;
          return;
        }
      } finally {
        if (id === generation) {
          pending = false;
          if (!disposed && !document.hidden && !forbidden)
            timer = setTimeout(poll, retryDelay(failures));
        }
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      ++generation;
      controller?.abort();
      pending = false;
      if (document.hidden) setState((old) => ({ ...old, status: "paused" }));
      else {
        setState((old) => ({ ...old, status: "connecting" }));
        poll();
      }
    };
    const online = () => {
      if (!document.hidden) visibility();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", online);
    visibility();
    return () => {
      disposed = true;
      ++generation;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", online);
    };
  }, [retry]);
  return { ...state, retry: () => setRetry((n) => n + 1) };
}
