export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.5 4 5.4v6.2c0 4.6 3.3 8.6 8 9.9 4.7-1.3 8-5.3 8-9.9V5.4l-8-2.9Z" />
      <path d="m9 12 2.2 2.2L15 10.5" />
    </svg>
  );
}
