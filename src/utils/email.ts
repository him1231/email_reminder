export async function sendTestEmail(to: string, subject: string, body: string) {
  // smtp.js (SmtpJS) usage: window.Email.send({...})
  const env = (window as any).__VITE_ENV__ || {};
  const user = env.VITE_SMTP_USER;
  const pass = env.VITE_SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP credentials missing: set VITE_SMTP_USER and VITE_SMTP_PASS');

  // Build mail options
  const mail = {
    Host: "smtp.gmail.com",
    Username: user,
    Password: pass,
    To: to,
    From: user,
    Subject: subject,
    Body: body,
    Port: 587,
    SecureToken: undefined
  } as any;

  if (!(window as any).Email || typeof (window as any).Email.send !== 'function') {
    throw new Error('SmtpJS not loaded. Ensure smtp.js is included in index.html');
  }

  return (window as any).Email.send(mail);
}
