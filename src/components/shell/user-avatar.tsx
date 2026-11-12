/* eslint-disable @next/next/no-img-element -- a small private image served by our own API */

/**
 * A person's round avatar: their photo when they chose one in My profile,
 * otherwise the first letter of their name on the brand colour, as before.
 */
export function UserAvatar({
  src,
  name,
  className = "size-8 text-xs",
}: {
  src: string | null | undefined;
  /** Name or e-mail; its first letter is the fallback. */
  name: string | null | undefined;
  /** Size and text size, e.g. "size-9 text-sm". */
  className?: string;
}) {
  const initial = (name || "P").trim().charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${className} shrink-0 rounded-full bg-muted object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground`}
    >
      {initial}
    </span>
  );
}
