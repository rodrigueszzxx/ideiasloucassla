const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox'],
  });
  try {
    for (const [width, height] of [[1440, 1000], [390, 844], [320, 568], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.ARCANE_TEST_URL || 'http://127.0.0.1:8000');
      await page.waitForFunction(() => !document.getElementById('btn-start-game').disabled);
      assert.equal(await page.locator('#splash-screen').isVisible(), true);
      for (const scene of ['pokemon', 'forest', 'dungeon']) {
        await page.locator(`[data-scene="${scene}"]`).click();
        assert.equal(await page.locator('#arcade-display').getAttribute('data-world'), scene);
        assert.equal(await page.locator('[data-scene][aria-pressed="true"]').count(), 1);
        const fits = await page.evaluate(() => document.documentElement.scrollWidth === innerWidth);
        assert(fits, `No horizontal overflow at ${width}px`);
      }
      await page.locator('#btn-splash-play').focus();
      await page.keyboard.press('Enter');
      await page.locator('#howto-modal').waitFor();
      await page.locator('#btn-howto-ok').click();
      await page.locator('#player-input').fill('Visitante');
      await page.locator('#btn-start-game').click();
      assert.equal(await page.locator('#splash-screen').isHidden(), true);
      await page.locator('#pause-button').click();
      await page.locator('#btn-pause-home').click();
      assert.equal(await page.locator('#btn-splash-play').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('[data-scene="dungeon"]').evaluate(el => el === document.activeElement), true);
      await page.locator('#btn-splash-ranking').click();
      await page.locator('#gameover-modal').waitFor();
      // Real endpoint: either a configured ranking or its explicit offline state.
      await page.waitForFunction(() => !document.getElementById('ranking-status').textContent.includes('Consultando'));
      await page.locator('#btn-home').click();
      await page.locator('.about-link').click();
      await page.waitForURL('**/pages/sobre-nos.php');
      assert.equal(await page.locator('h1').count(), 1);
      assert.deepEqual(errors, []);
      console.log(`PASS lobby ${width}×${height}: scenes, keyboard, start, pause/home, ranking, about`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
