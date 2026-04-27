import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-32 text-center">
      <div className="eyebrow">404</div>
      <h1 className="h-display mt-3">Not found.</h1>
      <p className="lede mt-4">
        That page doesn&rsquo;t exist — or has been deprecated.
      </p>
      <div className="mt-8">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
