"use client";

import { useState } from "react";

/**
 * The audited site's icon, loaded from the site itself. If it fails (no
 * icon, hotlinking blocked), the initial drawn underneath shows instead of
 * the browser's broken-image box.
 */
export function SiteLogo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="absolute inset-0 size-full bg-white object-contain p-2"
    />
  );
}
