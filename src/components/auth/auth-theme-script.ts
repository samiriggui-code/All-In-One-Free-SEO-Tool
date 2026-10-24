/**
 * The sign-in screens' theme choice, shared by the server-rendered
 * AuthShell and the client toggle. Kept out of the "use client" module:
 * a server component importing a constant from one gets a client
 * reference, not the string.
 */

export const AUTH_THEME_KEY = "rf-auth-theme";

/** Inline, runs before paint: re-applies this browser's choice. Static text, no user input. */
export const AUTH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${AUTH_THEME_KEY}");if(t==="dark"||t==="light"){document.documentElement.classList.toggle("dark",t==="dark");}}catch(e){}})();`;
