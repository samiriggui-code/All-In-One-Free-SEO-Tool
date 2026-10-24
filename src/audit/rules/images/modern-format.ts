import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MODERN_FORMATS = ["webp", "avif", "svg"];
export const LEGACY_FORMATS = ["jpg", "jpeg", "png", "gif", "bmp"];
export function getImageFormat(src: string) {
  try {
    const cleanSrc = src.split("?")[0].split("#")[0];
    const parts = cleanSrc.split(".");
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
  } catch {
  }
  return "";
}
export const modernFormatRule = defineRule({
  id: "images-modern-format",
  name: "Modern Image Formats",
  description: "Checks that modern image formats like WebP or AVIF are used for better compression",
  category: "images",
  weight: 10,
  run: (context) => {
    const { images, $ } = context;
    if (images.length === 0) {
      return pass(
        "images-modern-format",
        "No images found on page",
        { imageCount: 0 }
      );
    }
    const pictureElements = $("picture").length;
    const sourcesWithModernFormats = $('picture source[type*="webp"], picture source[type*="avif"]').length;
    const formatStats: Record<string, number> = {};
    const legacyImages = [];
    const modernImages = [];
    for (const img of images) {
      const format = getImageFormat(img.src);
      if (format) {
        formatStats[format] = (formatStats[format] || 0) + 1;
        if (LEGACY_FORMATS.includes(format)) {
          legacyImages.push({ src: img.src, format });
        } else if (MODERN_FORMATS.includes(format)) {
          modernImages.push({ src: img.src, format });
        }
      }
    }
    const totalWithFormat = legacyImages.length + modernImages.length;
    const modernPercentage = totalWithFormat > 0 ? (modernImages.length / totalWithFormat * 100).toFixed(1) : "0";
    if (modernImages.length === 0 && legacyImages.length > 0 && sourcesWithModernFormats === 0) {
      return warn(
        "images-modern-format",
        `No modern image formats detected (0% WebP/AVIF usage)`,
        {
          legacyImageCount: legacyImages.length,
          modernImageCount: 0,
          pictureElements,
          formatBreakdown: formatStats,
          legacyImages: legacyImages.slice(0, 10),
          suggestion: "Convert images to WebP or AVIF format for 25-50% smaller file sizes"
        }
      );
    }
    if (legacyImages.length > 0 && (modernImages.length > 0 || sourcesWithModernFormats > 0)) {
      return warn(
        "images-modern-format",
        `Partial modern format adoption (${modernPercentage}% WebP/AVIF)`,
        {
          legacyImageCount: legacyImages.length,
          modernImageCount: modernImages.length,
          pictureElements,
          pictureSourcesWithModernFormats: sourcesWithModernFormats,
          formatBreakdown: formatStats,
          suggestion: "Consider converting remaining legacy images to WebP or AVIF"
        }
      );
    }
    return pass(
      "images-modern-format",
      `Good modern format usage (${modernPercentage}% WebP/AVIF/SVG)`,
      {
        modernImageCount: modernImages.length,
        totalImages: images.length,
        pictureElements,
        formatBreakdown: formatStats
      }
    );
  }
});
