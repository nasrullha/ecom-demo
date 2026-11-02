"use client";

import { useEffect } from "react";

// Shown when something unexpected goes wrong on a page.
// Visitors see a friendly message; details stay in the server logs.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isSetup = /Supabase is not configured/i.test(error.message);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-muted">
        {isSetup
          ? "The shop is not connected to its database yet. Fill in .env.local (see README step 2) and restart."
          : "We could not load this page. Please try again in a moment."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Try again
      </button>
      {error.digest ? <p className="mt-4 text-xs text-muted">Reference: {error.digest}</p> : null}
    </div>
  );
}
