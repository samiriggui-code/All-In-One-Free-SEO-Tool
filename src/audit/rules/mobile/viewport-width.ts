import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const viewportWidthRule = defineRule({
  id: "mobile-viewport-width",
  name: "Viewport Fixed Width",
  description: "Checks if viewport meta tag sets a fixed width instead of device-width",
  category: "mobile",
  weight: 10,
  run: (context) => {
    const { $ } = context;
    const viewport = $('meta[name="viewport"]').attr("content");
    if (!viewport) {
      return pass(
        "mobile-viewport-width",
        "No viewport meta tag present; skipping width check (handled by viewport-present rule)",
        { viewportFound: false }
      );
    }
    const widthMatch = viewport.match(/width\s*=\s*([^\s,;]+)/i);
    if (!widthMatch) {
      return pass(
        "mobile-viewport-width",
        "Viewport meta tag does not specify a width directive",
        { viewportContent: viewport }
      );
    }
    const widthValue = widthMatch[1].trim().toLowerCase();
    if (widthValue === "device-width") {
      return pass(
        "mobile-viewport-width",
        "Viewport width is set to device-width (responsive)",
        { viewportContent: viewport, widthValue }
      );
    }
    const numericWidth = parseInt(widthValue, 10);
    if (!isNaN(numericWidth)) {
      return fail(
        "mobile-viewport-width",
        `Viewport sets a fixed width of ${numericWidth}px instead of device-width; mobile browsers will scale the page down`,
        {
          viewportContent: viewport,
          widthValue,
          fixedWidth: numericWidth,
          recommendation: 'Change width to device-width: <meta name="viewport" content="width=device-width, initial-scale=1">'
        }
      );
    }
    return pass(
      "mobile-viewport-width",
      `Viewport width is set to "${widthValue}"`,
      { viewportContent: viewport, widthValue }
    );
  }
});
