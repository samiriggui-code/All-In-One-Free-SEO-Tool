import { defineRule, fail, pass } from "@/audit/engine/define-rule";
import { fetchUrl } from "@/audit/crawler/fetcher";
import { rethrowIfAborted } from "@/audit/engine/errors";

export const MAX_IMAGES_TO_CHECK = 20;
export const brokenRule = defineRule({
  id: "images-broken",
  name: "No Broken Images",
  description: "Checks that all images are accessible (no 404 errors)",
  category: "images",
  weight: 15,
  run: async (context) => {
    const { images } = context;
    if (images.length === 0) {
      return pass("images-broken", "No images found on page", { imageCount: 0 });
    }
    const imagesToCheck = images.slice(0, MAX_IMAGES_TO_CHECK);
    const brokenImages: { src: string; status: number; }[] = [];
    await Promise.all(
      imagesToCheck.map(async (img) => {
        try {
          const status = await fetchUrl(img.src, 5e3, context.signal);
          if (status === 404 || status === 410) {
            brokenImages.push({ src: img.src, status });
          }
        } catch (error) {
          rethrowIfAborted(error, context.signal);
        }
      })
    );
    if (brokenImages.length > 0) {
      return fail(
        "images-broken",
        `Found ${brokenImages.length} broken image(s) (404/410 errors)`,
        {
          brokenCount: brokenImages.length,
          checkedCount: imagesToCheck.length,
          totalImages: images.length,
          brokenImages: brokenImages.slice(0, 10),
          suggestion: "Fix or remove broken image references"
        }
      );
    }
    return pass(
      "images-broken",
      `All ${imagesToCheck.length} checked image(s) are accessible`,
      {
        checkedCount: imagesToCheck.length,
        totalImages: images.length,
        note: images.length > MAX_IMAGES_TO_CHECK ? `Only first ${MAX_IMAGES_TO_CHECK} images were checked` : void 0
      }
    );
  }
});
