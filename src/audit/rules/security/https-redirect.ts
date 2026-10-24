import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { getUserAgent } from "@/audit/crawler/user-agent";
import { requestSignal } from "@/audit/crawler/fetcher";
import { rethrowIfAborted, throwIfAborted } from "@/audit/engine/errors";
import { auditFetch } from "@/audit/crawler/net";

export async function checkRedirect(url: string, timeout = 1e4, signal?: AbortSignal) {
  throwIfAborted(signal);
  const request = requestSignal(timeout, signal);
  try {
    const response = await auditFetch(url, {
      method: "HEAD",
      signal: request.signal,
      headers: {
        "User-Agent": getUserAgent()
      },
      redirect: "manual"
      // Don't follow redirects
    });
    const location = response.headers.get("location");
    return { statusCode: response.status, location };
  } catch (error) {
    rethrowIfAborted(error, signal);
    return { statusCode: 0, location: null };
  } finally {
    request.dispose();
  }
}
export const httpsRedirectRule = defineRule({
  id: "security-https-redirect",
  name: "HTTP to HTTPS Redirect",
  description: "Checks that HTTP requests redirect to HTTPS",
  category: "security",
  weight: 8,
  run: async (context) => {
    const { url } = context;
    try {
      const urlObj = new URL(url);
      const httpUrl = `http://${urlObj.host}${urlObj.pathname}${urlObj.search}`;
      const expectedHttpsUrl = `https://${urlObj.host}${urlObj.pathname}${urlObj.search}`;
      const { statusCode, location } = await checkRedirect(httpUrl, 1e4, context.signal);
      const details = {
        httpUrl,
        expectedHttpsUrl,
        statusCode,
        redirectLocation: location
      };
      if (statusCode === 0) {
        return warn(
          "security-https-redirect",
          "Could not connect to HTTP version (timeout or network error)",
          details
        );
      }
      if (statusCode >= 300 && statusCode < 400) {
        if (location) {
          try {
            const locationUrl = new URL(location, httpUrl);
            if (locationUrl.protocol === "https:") {
              return pass(
                "security-https-redirect",
                `HTTP redirects to HTTPS (${statusCode} -> ${location})`,
                details
              );
            } else {
              return fail(
                "security-https-redirect",
                `HTTP redirects to another HTTP URL instead of HTTPS (${statusCode} -> ${location})`,
                details
              );
            }
          } catch {
            return warn(
              "security-https-redirect",
              `HTTP redirects but location header is invalid: ${location}`,
              details
            );
          }
        }
        return warn(
          "security-https-redirect",
          `HTTP returns redirect status ${statusCode} but no Location header`,
          details
        );
      }
      if (statusCode === 200) {
        return fail(
          "security-https-redirect",
          "HTTP version is accessible without redirecting to HTTPS",
          details
        );
      }
      return warn(
        "security-https-redirect",
        `HTTP version returns status ${statusCode} (expected 301/302 redirect to HTTPS)`,
        details
      );
    } catch (error) {
      rethrowIfAborted(error, context.signal);
      const message = error instanceof Error ? error.message : String(error);
      return fail(
        "security-https-redirect",
        `Failed to check HTTP redirect: ${message}`,
        { url, error: message }
      );
    }
  }
});
