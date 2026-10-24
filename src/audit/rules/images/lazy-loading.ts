import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const ABOVE_FOLD_COUNT2 = 3;
export const lazyLoadingRule = defineRule({
  id: "images-lazy-loading",
  name: "Image Lazy Loading",
  description: 'Checks that images below the fold use loading="lazy" for better performance',
  category: "images",
  weight: 10,
  run: (context) => {
    const { images } = context;
    if (images.length === 0) {
      return pass(
        "images-lazy-loading",
        "No images found on page",
        { imageCount: 0 }
      );
    }
    const belowFoldImages = images.slice(ABOVE_FOLD_COUNT2);
    if (belowFoldImages.length === 0) {
      return pass(
        "images-lazy-loading",
        `Only ${images.length} image(s) found (considered above fold)`,
        {
          totalImages: images.length,
          aboveFoldThreshold: ABOVE_FOLD_COUNT2
        }
      );
    }
    const notLazyLoaded = belowFoldImages.filter((img) => !img.isLazyLoaded);
    if (notLazyLoaded.length > 0) {
      const percentage = (notLazyLoaded.length / belowFoldImages.length * 100).toFixed(1);
      return warn(
        "images-lazy-loading",
        `Found ${notLazyLoaded.length} below-fold image(s) not using lazy loading (${percentage}%)`,
        {
          notLazyLoadedCount: notLazyLoaded.length,
          belowFoldCount: belowFoldImages.length,
          totalImages: images.length,
          images: notLazyLoaded.slice(0, 10).map((img) => ({
            src: img.src
          })),
          suggestion: 'Add loading="lazy" to images below the fold to improve initial page load performance'
        }
      );
    }
    return pass(
      "images-lazy-loading",
      `All ${belowFoldImages.length} below-fold image(s) use lazy loading`,
      {
        belowFoldCount: belowFoldImages.length,
        totalImages: images.length
      }
    );
  }
});
