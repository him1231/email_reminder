import React from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { renderTemplate } from "../utils/templateRenderer";

export const ManualSendButton: React.FC<{ templateHtml: string; subject: string; recipient: { name: string; email: string } }> = ({ templateHtml, subject, recipient }) => {
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchor);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const { renderedRaw } = renderTemplate(templateHtml, { ...recipient, unsubscribeUrl: `https://example.com/unsubscribe?token=tok-demo-123` });
  const mailtoBody = encodeURIComponent(renderedRaw.replace(/<[^>]+>/g, "\n"));
  const mailto = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${mailtoBody}`;

  const downloadHtml = () => {
    const blob = new Blob([renderedRaw], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipient.email}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Button variant="outlined" onClick={handleOpen}>Send / Export</Button>
      <Menu anchorEl={anchor} open={open} onClose={handleClose}>
        <MenuItem component="a" href={mailto} onClick={handleClose}>Open in mail client</MenuItem>
        <MenuItem onClick={() => { downloadHtml(); handleClose(); }}>Download HTML</MenuItem>
      </Menu>
    </div>
  );
};
