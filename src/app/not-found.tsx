import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">The page you are looking for does not exist or has moved.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Back to the shop
      </Link>
    </div>
  );
}
