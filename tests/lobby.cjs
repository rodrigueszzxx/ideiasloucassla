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
      assert.equal(await page.locator('#splash-screen').evaluate(el =>
        el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0,
        'Reduced motion disables decorative animation');
      if (width === 1440) {
        await page.locator('#effects-toggle').click();
        assert.equal(await page.locator('#splash-screen').getAttribute('data-motion'), 'on');
        assert(await page.locator('.arcade-idle').evaluate(el =>
          el.getAnimations().some(a => a.playState === 'running')),
          'Visitor can explicitly enable movement despite OS reduced motion');
        await page.locator('#effects-toggle').click();
        assert.equal(await page.locator('#splash-screen').getAttribute('data-motion'), 'off');
        await page.reload();
        assert.equal(await page.locator('#effects-toggle').getAttribute('aria-pressed'), 'false');
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      assert(await page.locator('#entrance-cover').evaluate(el => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.left + r.width / 2 - innerWidth / 2) < 1;
      }), 'Arcade remains centered in portrait');
      assert(await page.locator('#btn-splash-play').evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      }));
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
      assert.equal(await page.locator('#btn-splash-ranking').evaluate(el => el === document.activeElement), true);
      await page.locator('#btn-splash-ranking').click();
      await page.locator('#gameover-modal').waitFor();
      // Real endpoint: either a configured ranking or its explicit offline state.
      await page.waitForFunction(() => !document.getElementById('ranking-status').textContent.includes('Consultando'));
      await page.locator('#btn-home').click();
      await page.locator('.about-link').click();
      await page.waitForURL('**/pages/sobre-nos.php');
      assert.equal(await page.locator('h1').count(), 1);
      assert.deepEqual(errors, []);
      console.log(`PASS lobby ${width}×${height}: keyboard, start, pause/home, ranking, about`);
      await page.close();
    }
    // Exercise the full animation and a second entry after returning home.
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.ARCANE_TEST_URL || 'http://127.0.0.1:8000');
    assert(await page.locator('#entrance-cover').evaluate(el =>
      el.getAnimations({ subtree: true }).some(a => a.playState === 'running')),
      'The idle arcade is animated');
    const idleTop = await page.locator('.arcade-idle').evaluate(el => el.getBoundingClientRect().top);
    await page.waitForFunction(previous =>
      Math.abs(document.querySelector('.arcade-idle').getBoundingClientRect().top - previous) > 5, idleTop);
    await page.mouse.move(50, 50);
    const firstTilt = await page.locator('.arcade-parallax').evaluate(el => getComputedStyle(el).transform);
    await page.mouse.move(1100, 700);
    await page.waitForFunction(previous =>
      getComputedStyle(document.querySelector('.arcade-parallax')).transform !== previous, firstTilt);
    const reflection = await page.locator('.crt-reflection').evaluate(el => getComputedStyle(el).transform);
    await page.waitForFunction(previous =>
      getComputedStyle(document.querySelector('.crt-reflection')).transform !== previous, reflection);
    for (let entry = 0; entry < 2; entry++) {
      await page.locator('#btn-splash-play').click();
      assert(await page.locator('#btn-splash-play').isDisabled());
      assert.equal(await page.locator('#howto-modal').isHidden(), true);
      await page.waitForFunction(() => {
        const cover = getComputedStyle(document.getElementById('entrance-cover'));
        return new DOMMatrixReadOnly(cover.transform).a > 1.1;
      });
      // Repeated keyboard events must not schedule a second entry.
      await page.keyboard.press('Enter');
      await page.locator('#howto-modal').waitFor();
      assert.equal(await page.locator('#entrance-cover').evaluate(el =>
        el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0,
        'Hidden arcade does not keep running decorative animation');
      assert(await page.locator('#btn-howto-ok').evaluate(el => el === document.activeElement));
      await page.locator('#btn-howto-ok').click();
      await page.locator('#btn-view-ranking').click();
      await page.locator('#btn-home').click();
      assert.equal(await page.locator('#btn-splash-play').isEnabled(), true);
      assert.equal(await page.locator('#splash-screen').getAttribute('aria-busy'), null);
      assert.equal(await page.locator('#entrance-cover').evaluate(el => getComputedStyle(el).transform), 'none');
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log('PASS arcade zoom, brand transition, repeated input and replay');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
