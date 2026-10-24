import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const MAX_RECOMMENDED = 125;
export const MAX_EXCESSIVE = 250;
export const altLengthRule = defineRule({
  id: "images-alt-length",
  name: "Image Alt Text Length",
  description: "Checks that image alt text is not excessively long (over 125 characters)",
  category: "images",
  weight: 6,
  run: (context) => {
    const { images } = context;
    const imagesWithAlt = images.filter((img) => img.hasAlt && img.alt.trim().length > 0);
    if (imagesWithAlt.length === 0) {
      return pass(
        "images-alt-length",
        "No images with alt text to evaluate for length",
        { imageCount: 0 }
      );
    }
    const issues = [];
    for (const img of imagesWithAlt) {
      const altLength = img.alt.trim().length;
      if (altLength > MAX_EXCESSIVE) {
        issues.push({
          src: img.src,
          alt: img.alt.substring(0, 60) + "...",
          length: altLength,
          severity: "excessive"
        });
      } else if (altLength > MAX_RECOMMENDED) {
        issues.push({
          src: img.src,
          alt: img.alt.substring(0, 60) + "...",
          length: altLength,
          severity: "long"
        });
      }
    }
    if (issues.length === 0) {
      return pass(
        "images-alt-length",
        `All ${imagesWithAlt.length} image(s) have alt text within the recommended length (${MAX_RECOMMENDED} chars)`,
        {
          totalImagesWithAlt: imagesWithAlt.length,
          maxRecommended: MAX_RECOMMENDED
        }
      );
    }
    const excessiveCount = issues.filter((i) => i.severity === "excessive").length;
    const longCount = issues.filter((i) => i.severity === "long").length;
    if (excessiveCount > 0) {
      return fail(
        "images-alt-length",
        `Found ${excessiveCount} image(s) with excessively long alt text (over ${MAX_EXCESSIVE} chars)`,
        {
          totalImagesWithAlt: imagesWithAlt.length,
          excessiveCount,
          longCount,
          issues: issues.slice(0, 10),
          recommendation: `Keep alt text concise and under ${MAX_RECOMMENDED} characters; use longdesc or figcaption for detailed descriptions`
        }
      );
    }
    return warn(
      "images-alt-length",
      `Found ${longCount} image(s) with long alt text (${MAX_RECOMMENDED}-${MAX_EXCESSIVE} chars)`,
      {
        totalImagesWithAlt: imagesWithAlt.length,
        longCount,
        issues: issues.slice(0, 10),
        recommendation: `Aim for alt text under ${MAX_RECOMMENDED} characters for optimal screen reader and SEO performance`
      }
    );
  }
});
