import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    await page.goto('http://localhost:3333');

    // Create dummy PDF
    fs.writeFileSync('dummy.pdf', '%PDF-1.4\n%EOF');

    const elementHandle = await page.$('input[type=file]');
    await elementHandle.uploadFile('dummy.pdf');

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
