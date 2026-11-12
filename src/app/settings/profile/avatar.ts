/**
 * Rules for a profile photo, shared by the browser (which crops and
 * shrinks the picture before sending it) and the server action (which
 * refuses anything else).
 */

/** Side of the square the browser draws the photo into. */
export const AVATAR_SIZE = 256;

/** Largest data URL we store: a 256 px WebP is usually 10–40 KB. */
export const AVATAR_MAX_CHARS = 200_000;

/** Largest file the browser agrees to read before shrinking it. */
export const AVATAR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * A raster image as a base64 data URL. SVG is refused: it can carry
 * script, and an avatar is shown on every page of the app.
 */
const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isValidAvatar(value: string): boolean {
  return value.length <= AVATAR_MAX_CHARS && AVATAR_DATA_URL.test(value);
}

/** Cache key for /api/auth/avatar: changes whenever the photo does. */
export function avatarVersion(avatar: string | null): string | null {
  if (!avatar) return null;
  let h = 0;
  for (let i = 0; i < avatar.length; i++) h = (h * 31 + avatar.charCodeAt(i)) | 0;
  return `${avatar.length.toString(36)}${(h >>> 0).toString(36)}`;
}
