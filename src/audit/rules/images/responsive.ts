import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const responsiveRule = defineRule({
  id: "images-responsive",
  name: "Responsive Images",
  description: "Checks that images use srcset or picture elements for responsive design",
  category: "images",
  weight: 10,
  run: (context) => {
    const { images, $ } = context;
    if (images.length === 0) {
      return pass(
        "images-responsive",
        "No images found on page",
        { imageCount: 0 }
      );
    }
    const pictureElements = $("picture").length;
    const imagesWithSrcset = $("img[srcset]").length;
    const imagesWithSizes = $("img[sizes]").length;
    const sourceElements = $("picture source").length;
    const totalResponsive = pictureElements + imagesWithSrcset;
    const nonResponsiveImages = [];
    for (const img of images) {
      const imgSelector = `picture img[src="${img.src}"]`;
      const isInPicture = $(imgSelector).length > 0;
      const width = img.width ? parseInt(img.width, 10) : 0;
      const height = img.height ? parseInt(img.height, 10) : 0;
      const isLargeImage = width >= 300 || height >= 300 || !width && !height;
      const imgElement = $(`img[src="${img.src}"]`);
      const hasSrcset = imgElement.attr("srcset") !== void 0;
      if (!isInPicture && !hasSrcset && isLargeImage) {
        nonResponsiveImages.push({
          src: img.src,
          width: img.width,
          height: img.height
        });
      }
    }
    if (nonResponsiveImages.length === 0) {
      return pass(
        "images-responsive",
        `Good responsive image usage (${pictureElements} picture element(s), ${imagesWithSrcset} srcset attribute(s))`,
        {
          totalImages: images.length,
          pictureElements,
          imagesWithSrcset,
          imagesWithSizes,
          sourceElements
        }
      );
    }
    const percentage = (nonResponsiveImages.length / images.length * 100).toFixed(1);
    if (totalResponsive === 0) {
      return warn(
        "images-responsive",
        `No responsive image techniques detected (${percentage}% of images could benefit)`,
        {
          nonResponsiveCount: nonResponsiveImages.length,
          totalImages: images.length,
          pictureElements: 0,
          imagesWithSrcset: 0,
          images: nonResponsiveImages.slice(0, 10),
          suggestion: "Use srcset attribute or picture element to serve appropriately sized images for different screen sizes"
        }
      );
    }
    return warn(
      "images-responsive",
      `Found ${nonResponsiveImages.length} image(s) not using responsive techniques (${percentage}%)`,
      {
        nonResponsiveCount: nonResponsiveImages.length,
        totalImages: images.length,
        pictureElements,
        imagesWithSrcset,
        imagesWithSizes,
        images: nonResponsiveImages.slice(0, 10),
        suggestion: "Consider adding srcset or picture element for larger images to improve performance on various devices"
      }
    );
  }
});
