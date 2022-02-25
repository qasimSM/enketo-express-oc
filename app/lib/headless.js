const config = require('../models/config-model').server;

const { timeout } = config.headless;
const puppeteer = require('puppeteer');

async function run(url) {
    if (!url) {
        throw new Error('No url provided');
    }

    const browser = await puppeteer.launch({ headless: true, devtools: false });
    const page = await browser.newPage();
    let fieldsubmissions;

    try {
        page.on('pageerror', (e) => {
            // I have not been able to actually reach this code.
            e.status = 400;
            throw e;
        });

        page.on('requestfailed', (e) => {
            // I have not been able to actually reach this code.
            e.status = 400;
            throw e;
        });

        await page.goto(url).catch((e) => {
            // I have not been able to actually reach this code.
            e.status = 400;
            throw e;
        });

        // await page.evaluate( () => { throw new Error( 'js throw some error' ); } );
        const element = await page
            .waitForSelector('#headless-result', { timeout })
            .catch((e) => {
                e.status = /timeout/i.test(e.message) ? 408 : 400;
                throw e;
            });

        const errorEl = await element.$('#error');
        // Load or submission errors caught by Enketo
        if (errorEl) {
            const msg = await errorEl.getProperty('textContent');
            const error = new Error(await msg.jsonValue());
            error.status = 400;
            throw error;
        }

        const fsEl = await element.$('#fieldsubmissions');
        if (fsEl) {
            const fs = await fsEl.getProperty('textContent');
            fieldsubmissions = Number(await fs.jsonValue());
        }
    } catch (e) {
        e.status = e.status || 400;
        await page.close();
        throw e;
    }

    await page.close();
    await browser.close();

    return fieldsubmissions;
}

module.exports = { run };
