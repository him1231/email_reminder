import React from "react";

export const TemplatePreview: React.FC<{ safeHtml: string }> = ({ safeHtml }) => {
  return (
    <div style={{ border: "1px solid var(--mui-palette-divider)", borderRadius: 8, padding: 12 }}>
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
};
