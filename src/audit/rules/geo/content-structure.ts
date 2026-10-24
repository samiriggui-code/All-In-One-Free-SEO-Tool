import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const contentStructureRule = defineRule({
  id: "geo-content-structure",
  name: "Content Structure for AI",
  description: "Checks if the page has clear content structure for AI extraction (main area, heading hierarchy, paragraphs, structured data)",
  category: "geo",
  weight: 25,
  run: (context) => {
    const { $ } = context;
    const signals = [];
    const missingSignals = [];
    const hasMainArea = $("main").length > 0 || $("article").length > 0 || $('[role="main"]').length > 0;
    if (hasMainArea) {
      signals.push("main content area");
    } else {
      missingSignals.push('main content area (<main>, <article>, or [role="main"])');
    }
    const headings: number[] = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const tagName = el.tagName?.toLowerCase() || "";
      const level = parseInt(tagName.replace("h", ""), 10);
      if (!isNaN(level)) {
        headings.push(level);
      }
    });
    const uniqueLevels = [...new Set(headings)].sort((a, b) => a - b);
    const hasHierarchy = uniqueLevels.length >= 2 && uniqueLevels[0] <= 2;
    if (hasHierarchy) {
      signals.push("hierarchical headings");
    } else {
      missingSignals.push(
        "hierarchical headings (h1 followed by h2, h3, etc.)"
      );
    }
    const paragraphs = $("p");
    let totalParagraphWords = 0;
    paragraphs.each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 0) {
        totalParagraphWords += text.split(/\s+/).length;
      }
    });
    const hasParagraphs = totalParagraphWords >= 30;
    if (hasParagraphs) {
      signals.push("paragraph content");
    } else {
      missingSignals.push(
        "paragraph content (at least 30 words of prose in <p> elements)"
      );
    }
    const hasLists = $("ul, ol, dl").length > 0;
    const hasTables = $("table").length > 0;
    const hasStructuredData = hasLists || hasTables;
    if (hasStructuredData) {
      signals.push("structured data (lists/tables)");
    } else {
      missingSignals.push("structured data (<ul>, <ol>, <dl>, or <table> elements)");
    }
    const signalCount = signals.length;
    const details = {
      presentSignals: signals,
      missingSignals,
      signalCount,
      headingLevels: uniqueLevels,
      paragraphWordCount: totalParagraphWords,
      hasLists,
      hasTables
    };
    if (signalCount === 4) {
      return pass(
        "geo-content-structure",
        "Page has excellent content structure for AI extraction (all 4 signals present)",
        details
      );
    }
    if (signalCount === 3) {
      return warn(
        "geo-content-structure",
        `Good content structure (${signalCount}/4 signals). Missing: ${missingSignals.join("; ")}`,
        details
      );
    }
    return fail(
      "geo-content-structure",
      `Poor content structure for AI extraction (${signalCount}/4 signals). Missing: ${missingSignals.join("; ")}`,
      {
        ...details,
        recommendation: "Add a clear <main> or <article> area, use hierarchical headings, write paragraph prose, and include lists or tables for structured information"
      }
    );
  }
});
