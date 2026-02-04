async function loadSmtpJs(timeout = 7000) {
  if ((window as any).Email && typeof (window as any).Email.send === 'function') return;

  // If another loader already added the script, wait for it
  const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.includes('smtpjs.com'));
  if (!existing) {
    const s = document.createElement('script');
    s.src = 'https://smtpjs.com/v3/smtp.js';
    s.async = true;
    document.head.appendChild(s);
  }

  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(() => {
      if ((window as any).Email && typeof (window as any).Email.send === 'function') {
        clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('Timed out loading smtp.js'));
      }
    }, 100);
  });
}

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

  try {
    await loadSmtpJs();
  } catch (err) {
    throw new Error('SmtpJS not loaded. Ensure smtp.js is available (network/CSP may block). ' + (err as Error).message);
  }

  return (window as any).Email.send(mail);
}
