import Mustache from "mustache";
import DOMPurify from "dompurify";

/**
 * Render a template (HTML) with provided data and sanitize output for preview.
 * - unknown placeholders remain as empty string
 * - caller must NOT use this output as final unescaped HTML for email sending without review
 */
export function renderTemplate(html: string, data: Record<string, unknown>): { safeHtml: string; renderedRaw: string } {
  // Mustache will leave unknowns empty by default; provide empty-string fallback
  const renderedRaw = Mustache.render(html || "", data || {});
  const safeHtml = DOMPurify.sanitize(renderedRaw, { USE_PROFILES: { html: true } });
  return { safeHtml, renderedRaw };
}
