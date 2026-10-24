import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findOgTag } from "@/audit/rules/social/open-graph";

export const RECOMMENDED_WIDTH = 1200;
export const RECOMMENDED_HEIGHT = 630;
export const MIN_WIDTH = 200;
export const MIN_HEIGHT = 200;
export const ogImageSizeRule = defineRule({
  id: "social-og-image-size",
  name: "Open Graph Image Size",
  description: "Checks that og:image has recommended dimensions (1200x630) via og:image:width and og:image:height meta tags",
  category: "social",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const ogImage = findOgTag($, "og:image")?.content;
    if (!ogImage) {
      return fail(
        "social-og-image-size",
        "No og:image found - cannot check dimensions",
        { hasImage: false }
      );
    }
    const widthMeta = findOgTag($, "og:image:width")?.content;
    const heightMeta = findOgTag($, "og:image:height")?.content;
    const width = widthMeta ? parseInt(widthMeta, 10) : null;
    const height = heightMeta ? parseInt(heightMeta, 10) : null;
    if (!widthMeta && !heightMeta) {
      return warn(
        "social-og-image-size",
        `Missing og:image:width and og:image:height meta tags. Add these with recommended size ${RECOMMENDED_WIDTH}x${RECOMMENDED_HEIGHT}`,
        {
          hasImage: true,
          ogImage,
          hasDimensions: false,
          recommendedWidth: RECOMMENDED_WIDTH,
          recommendedHeight: RECOMMENDED_HEIGHT
        }
      );
    }
    if (widthMeta && (width === null || isNaN(width)) || heightMeta && (height === null || isNaN(height))) {
      return warn(
        "social-og-image-size",
        "og:image dimension meta tags contain invalid values",
        {
          hasImage: true,
          ogImage,
          widthMeta,
          heightMeta,
          invalidValues: true
        }
      );
    }
    if (!width || !height) {
      return warn(
        "social-og-image-size",
        `Only ${width ? "width" : "height"} specified. Add both og:image:width and og:image:height`,
        {
          hasImage: true,
          ogImage,
          width,
          height,
          incomplete: true
        }
      );
    }
    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      return fail(
        "social-og-image-size",
        `og:image is too small (${width}x${height}). Minimum is ${MIN_WIDTH}x${MIN_HEIGHT}`,
        {
          hasImage: true,
          ogImage,
          width,
          height,
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          tooSmall: true
        }
      );
    }
    if (width >= RECOMMENDED_WIDTH && height >= RECOMMENDED_HEIGHT) {
      return pass(
        "social-og-image-size",
        `og:image has optimal dimensions (${width}x${height})`,
        {
          hasImage: true,
          ogImage,
          width,
          height,
          optimal: true
        }
      );
    }
    return warn(
      "social-og-image-size",
      `og:image dimensions (${width}x${height}) are below recommended ${RECOMMENDED_WIDTH}x${RECOMMENDED_HEIGHT}`,
      {
        hasImage: true,
        ogImage,
        width,
        height,
        recommendedWidth: RECOMMENDED_WIDTH,
        recommendedHeight: RECOMMENDED_HEIGHT,
        belowRecommended: true
      }
    );
  }
});
