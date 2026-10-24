import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const dimensionsRule = defineRule({
  id: "images-dimensions",
  name: "Image Dimensions",
  description: "Checks that images have width and height attributes to prevent layout shift (CLS)",
  category: "images",
  weight: 15,
  run: (context) => {
    const { images } = context;
    if (images.length === 0) {
      return pass(
        "images-dimensions",
        "No images found on page",
        { imageCount: 0 }
      );
    }
    const missingDimensions = [];
    for (const img of images) {
      const hasWidth = !!img.width && img.width.trim() !== "";
      const hasHeight = !!img.height && img.height.trim() !== "";
      if (!hasWidth || !hasHeight) {
        missingDimensions.push({
          src: img.src,
          hasWidth,
          hasHeight
        });
      }
    }
    if (missingDimensions.length > 0) {
      const percentage = (missingDimensions.length / images.length * 100).toFixed(1);
      const missingBoth = missingDimensions.filter((d) => !d.hasWidth && !d.hasHeight);
      const missingWidth = missingDimensions.filter((d) => !d.hasWidth && d.hasHeight);
      const missingHeight = missingDimensions.filter((d) => d.hasWidth && !d.hasHeight);
      return warn(
        "images-dimensions",
        `Found ${missingDimensions.length} image(s) missing width and/or height attributes (${percentage}% of images)`,
        {
          issueCount: missingDimensions.length,
          totalImages: images.length,
          missingBothCount: missingBoth.length,
          missingWidthOnlyCount: missingWidth.length,
          missingHeightOnlyCount: missingHeight.length,
          images: missingDimensions.slice(0, 10),
          suggestion: "Add explicit width and height attributes to images to prevent Cumulative Layout Shift (CLS)"
        }
      );
    }
    return pass(
      "images-dimensions",
      `All ${images.length} image(s) have width and height attributes`,
      { totalImages: images.length }
    );
  }
});
