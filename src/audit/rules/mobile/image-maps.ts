import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const imageMapsRule = defineRule({
  id: "mobile-image-maps",
  name: "Image Maps",
  description: "Checks for <map>/<area> image maps, which are not mobile-friendly",
  category: "mobile",
  weight: 8,
  run: (context) => {
    const { $ } = context;
    const mapCount = $("map").length;
    const areaCount = $("area").length;
    if (mapCount === 0 && areaCount === 0) {
      return pass(
        "mobile-image-maps",
        "No image map tags found",
        { mapCount: 0, areaCount: 0 }
      );
    }
    return warn(
      "mobile-image-maps",
      `Page uses image maps (${mapCount} <map>, ${areaCount} <area>); their fixed-coordinate tap targets do not adapt to mobile screens`,
      {
        mapCount,
        areaCount,
        recommendation: "Replace image maps with SVG links or positioned anchors over a fluid image"
      }
    );
  }
});
