import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    const response = await page.goto('http://localhost:8080', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('STATUS:', response ? response.status() : 'null');
    const content = await page.content();
    console.log('CONTENT LENGTH:', content.length);
    console.log('BODY HAS ERRORS?', content.includes('style="color:red;'));

    // Check if the script grabbed any specific errors from the DOM
    const rootHTML = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML : 'NO ROOT ELEMENT';
    });
    console.log('ROOT HTML:', rootHTML.substring(0, 500));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  await browser.close();
})();
