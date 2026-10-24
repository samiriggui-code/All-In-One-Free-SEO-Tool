import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const ABOVE_FOLD_COUNT = 3;
export const lazyAboveFoldRule = defineRule({
  id: "perf-lazy-above-fold",
  name: "Lazy Loading Above Fold",
  description: "Detects lazy loading on above-fold images that should load immediately",
  category: "perf",
  weight: 15,
  run: (context) => {
    const { images } = context;
    if (images.length === 0) {
      return pass("perf-lazy-above-fold", "No images found on page", {
        aboveFoldImages: [],
        totalImages: 0
      });
    }
    const aboveFoldImages = images.slice(0, ABOVE_FOLD_COUNT);
    const lazyAboveFold = aboveFoldImages.filter((img) => img.isLazyLoaded);
    const firstImageLazy = aboveFoldImages[0]?.isLazyLoaded ?? false;
    const details = {
      aboveFoldImages: aboveFoldImages.map((img) => ({
        src: img.src,
        isLazy: img.isLazyLoaded
      })),
      lazyAboveFoldCount: lazyAboveFold.length,
      firstImageLazy,
      totalImages: images.length,
      aboveFoldThreshold: ABOVE_FOLD_COUNT
    };
    if (firstImageLazy) {
      return fail(
        "perf-lazy-above-fold",
        `Hero image has loading="lazy" - this delays LCP`,
        details
      );
    }
    if (lazyAboveFold.length > 0) {
      return warn(
        "perf-lazy-above-fold",
        `${lazyAboveFold.length} above-fold image(s) have loading="lazy"`,
        details
      );
    }
    const message = aboveFoldImages.length < ABOVE_FOLD_COUNT ? `${aboveFoldImages.length} image(s) correctly without lazy loading` : `First ${ABOVE_FOLD_COUNT} images correctly without lazy loading`;
    return pass("perf-lazy-above-fold", message, details);
  }
});
