const { chromium } = require('playwright');
const fs = require('fs');
(async ()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => { logs.push({type:msg.type(), text: msg.text()}); console.log('CONSOLE>', msg.type(), msg.text()); });
  page.on('pageerror', err => { logs.push({type:'pageerror', text: err.stack || err.toString()}); console.error('PAGEERROR', err.stack || err.toString()); });
  await page.goto('http://localhost:5000/staff-groups', {waitUntil:'networkidle'}).catch(e=>console.error('goto error',e.stack||e));
  await page.waitForTimeout(3000);
  fs.writeFileSync('repro-logs.json', JSON.stringify(logs, null, 2));
  await browser.close();
})();