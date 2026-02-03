import { renderTemplate } from "../../src/utils/templateRenderer";

describe("TemplateRenderer", () => {
  it("replaces placeholders and sanitizes HTML", () => {
    const html = '<p>Hello {{name}}</p><img src=x onerror=alert(1) />';
    const { safeHtml, renderedRaw } = renderTemplate(html, { name: 'Asha' });

    expect(renderedRaw).toContain('Hello Asha');
    expect(safeHtml).toContain('Hello Asha');
    // sanitizer should remove onerror attribute
    expect(safeHtml).not.toContain('onerror');
  });
});
