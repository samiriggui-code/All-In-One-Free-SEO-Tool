import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const GENERIC_ALT_PATTERNS = [
  "image",
  "picture",
  "photo",
  "img",
  "pic",
  "graphic",
  "icon",
  "logo",
  "banner",
  "untitled",
  "screenshot",
  "screen shot",
  "placeholder",
  "test",
  "undefined",
  "null",
  "none",
  "blank",
  "spacer",
  ".",
  "-",
  "_"
];
export const MIN_ALT_LENGTH = 5;
export const MAX_ALT_LENGTH = 125;
export const altQualityRule = defineRule({
  id: "images-alt-quality",
  name: "Image Alt Text Quality",
  description: 'Checks that image alt text is descriptive and not generic like "image" or "photo"',
  category: "images",
  weight: 15,
  run: (context) => {
    const { images } = context;
    const imagesWithAlt = images.filter((img) => img.hasAlt);
    if (imagesWithAlt.length === 0) {
      return pass(
        "images-alt-quality",
        "No images with alt attributes to evaluate",
        { imageCount: 0 }
      );
    }
    const issues = [];
    for (const img of imagesWithAlt) {
      const alt = img.alt.trim().toLowerCase();
      if (!alt) {
        continue;
      }
      if (alt.length < MIN_ALT_LENGTH && alt !== "") {
        issues.push({
          src: img.src,
          alt: img.alt,
          issue: `Alt text too short (${alt.length} chars, minimum ${MIN_ALT_LENGTH})`
        });
        continue;
      }
      if (alt.length > MAX_ALT_LENGTH) {
        issues.push({
          src: img.src,
          alt: img.alt.substring(0, 50) + "...",
          issue: `Alt text too long (${alt.length} chars, recommended max ${MAX_ALT_LENGTH})`
        });
        continue;
      }
      const isGeneric = GENERIC_ALT_PATTERNS.some(
        (pattern) => alt === pattern || alt.startsWith(pattern + " ")
      );
      if (isGeneric) {
        issues.push({
          src: img.src,
          alt: img.alt,
          issue: "Generic or non-descriptive alt text"
        });
        continue;
      }
      if (/^(img|dsc|pic|photo|image|screenshot)[_-]?\d+/i.test(alt)) {
        issues.push({
          src: img.src,
          alt: img.alt,
          issue: "Alt text appears to be a file name"
        });
        continue;
      }
      const words3 = alt.split(/\s+/);
      const wordCounts = /* @__PURE__ */ new Map();
      for (const word of words3) {
        if (word.length > 2) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
      const maxRepeat = Math.max(...Array.from(wordCounts.values()), 0);
      if (maxRepeat > 3 && words3.length > 5) {
        issues.push({
          src: img.src,
          alt: img.alt,
          issue: "Alt text may contain keyword stuffing"
        });
      }
    }
    if (issues.length > 0) {
      const percentage = (issues.length / imagesWithAlt.length * 100).toFixed(1);
      return warn(
        "images-alt-quality",
        `Found ${issues.length} image(s) with low-quality alt text (${percentage}% of images with alt)`,
        {
          issueCount: issues.length,
          totalImagesWithAlt: imagesWithAlt.length,
          issues: issues.slice(0, 10),
          suggestion: "Write descriptive alt text that explains the content and context of each image"
        }
      );
    }
    return pass(
      "images-alt-quality",
      `All ${imagesWithAlt.length} image(s) have quality alt text`,
      { totalImagesWithAlt: imagesWithAlt.length }
    );
  }
});
