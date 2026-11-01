const {test, expect} = require('@playwright/test');
const names = ['Anna', 'Bo', 'Cecilia', 'David', 'Eva', 'Filip', 'Greta', 'Hugo', 'Ida', 'Johan', 'Karin', 'Lars', 'Maria', 'Nils'];
const groupMembers = page => page.locator('#output .group-result ul').allTextContents();

test('list and grouping settings survive real page navigation; returning does not focus an input', async ({page}) => {
  await page.goto('/#gruppera');
  await page.locator('#entries').fill(names.join('\n'));
  await expect(page.locator('#group-method')).toHaveValue('size');
  await expect(page.locator('#count')).toHaveValue('4');
  await page.getByRole('link', {name: 'Nummer', exact: true}).click();
  await page.getByRole('link', {name: 'Listverktyg', exact: true}).click();
  await expect(page.locator('#entries')).toHaveValue(names.join('\n'));
  await page.locator('#submit').click();
  await expect(page.locator('#output .group-result')).toHaveCount(4);
  await page.locator('#edit-draw').click();
  await expect(page.locator('#main')).toBeFocused();
  await expect(page.locator('#entries')).not.toBeFocused();
});

test('legacy drafts retain group counts while new sessions default to maximum size', async ({page}) => {
  await page.addInitScript(() => sessionStorage.setItem('randomisera-list-draft-v1', JSON.stringify({version: 1, text: 'A\nB\nC\nD\nE\nF\nG\nH\nI\nJ', mode: 'groups', counts: {choose: 1, groups: 2}, unique: true, active: null})));
  await page.goto('/');
  await expect(page.locator('#group-method')).toHaveValue('groups');
  await expect(page.locator('#count')).toHaveValue('2');
  await page.locator('#submit').click();
  await expect(page.locator('#output .group-result')).toHaveCount(2);
});

test('saved lists can be saved, loaded and updated without automatic overwrite', async ({page}) => {
  await page.goto('/');
  await page.locator('#entries').fill('Anna\nBo');
  await page.locator('#open-save').click();
  await page.locator('#list-name').fill('Test list');
  await page.locator('#save-list').click();
  await page.locator('#entries').fill('Anna\nBo\nCecilia');
  await page.reload();
  await expect(page.locator('#entries')).toHaveValue('Anna\nBo\nCecilia');
  await expect(page.locator('#update-list')).toBeEnabled();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('randomisera-saved-lists-v1')).lists[0].entries);
  expect(stored).toEqual(['Anna', 'Bo']);
  await page.locator('#update-list').click();
  await page.getByRole('link', {name: 'Nummer', exact: true}).click();
  await page.getByRole('link', {name: 'Listverktyg', exact: true}).click();
  await expect(page.locator('#update-list')).toBeDisabled();
});

test('tournament preserves exact teams and winners; regrouping resets it', async ({page}) => {
  await page.goto('/#gruppera');
  await page.locator('#entries').fill(names.join('\n'));
  await page.locator('#submit').click();
  const original = await groupMembers(page);
  await page.locator('#tournament-start').click();
  await page.locator('#match-output button').first().click();
  const winner = await page.locator('#match-output button[aria-pressed="true"]').getAttribute('aria-label');
  await page.locator('#match-back').click();
  expect(await groupMembers(page)).toEqual(original);
  await page.locator('#tournament-start').click();
  await expect(page.locator('#match-output button[aria-pressed="true"]')).toHaveAttribute('aria-label', winner);
  await page.locator('#match-back').click();
  await page.locator('#next-draw').click();
  await page.locator('#tournament-start').click();
  await expect(page.locator('#match-output button[aria-pressed="true"]')).toHaveCount(0);
});

test('dice locking works with keyboard and disables rerolls when all are locked', async ({page}) => {
  await page.goto('/singla-slant/#tarning');
  await page.locator('#dice-count').fill('3');
  await page.locator('#submit').click();
  const first = page.locator('.die-button').first();
  const value = await first.textContent();
  await first.focus();
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#next-draw').click();
  await expect(first).toHaveText(value);
  await page.locator('.die-button').nth(1).click();
  await page.locator('.die-button').nth(2).click();
  await expect(page.locator('#next-draw')).toBeDisabled();
  await page.locator('#unlock-dice').click();
  await expect(page.locator('#next-draw')).toBeEnabled();
});

test('presentation counter changes even for identical values and reduced motion skips animation', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/slumpa-nummer/');
  await page.locator('#min').fill('42');
  await page.locator('#max').fill('42');
  await page.locator('#submit').click();
  await page.locator('#next-draw').click();
  await expect(page.locator('#draw-counter')).toHaveText('Slumpning 2');
  await expect(page.locator('#output')).toHaveText('42');
  expect(await page.locator('#output').evaluate(node => node.getAnimations({subtree: true}).length)).toBe(0);
});

test('all published pages load without runtime errors or horizontal overflow', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/', '/dela-in-i-grupper/', '/slumpa-lista/', '/slumpa-nummer/', '/singla-slant/', '/ja-eller-nej/', '/kasta-tarning/', '/app/', '/lagring-och-integritet/']) {
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('dedicated quick-choice addresses open the right mode and browser Back restores it', async ({page}) => {
  for (const [route, heading, mode] of [['/ja-eller-nej/', 'Slumpa ja eller nej', 'yes'], ['/kasta-tarning/', 'Kasta tärning', 'dice']]) {
    await page.goto(route);
    await expect(page.locator('#page-heading')).toHaveText(heading);
    await expect(page.locator('#decision-' + mode)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#submit').click();
    await expect(page.locator('#presentation-view')).toBeVisible();
    await page.locator('#edit-draw').click();
    await page.locator('#decision-coin').click();
    await expect(page.locator('#page-heading')).toHaveText('Singla slant');
    await page.goBack();
    await expect(page.locator('#page-heading')).toHaveText(heading);
  }
});

test('search entry pages expose their own content and real links without JavaScript', async ({browser, baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled: false, baseURL});
  const page = await context.newPage();
  for (const [route, heading] of [['/', 'Slumpa namn och egna alternativ'], ['/dela-in-i-grupper/', 'Dela in i slumpmässiga grupper'], ['/slumpa-lista/', 'Blanda en lista'], ['/slumpa-nummer/', 'Slumpa nummer'], ['/ja-eller-nej/', 'Slumpa ja eller nej'], ['/kasta-tarning/', 'Kasta tärning']]) {
    await page.goto(route);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(heading);
    await expect(page.locator('.tool-description')).toBeVisible();
    await expect(page.locator('.tool-links a')).toHaveCount(6);
  }
  await context.close();
});

test('tool explanations stay consistent across mode buttons, main navigation and direct links', async ({page}) => {
  await page.goto('/');
  await page.locator('[data-list-mode="groups"]').click();
  await expect(page.locator('#tool-description')).toBeVisible();
  await expect(page.locator('#use-cases-title')).toHaveText('Slumpa grupper till klassrummet, mötet eller matchen');
  const groups = await page.locator('#tool-description').textContent();
  await page.getByRole('link', {name: 'Nummer', exact: true}).click();
  await page.getByRole('link', {name: 'Listverktyg', exact: true}).click();
  await expect(page.locator('#tool-description')).toHaveText(groups);
  await page.goto('/dela-in-i-grupper/');
  await expect(page.locator('#tool-description')).toHaveText(groups);
  await page.getByRole('link', {name: 'Slumpa namn', exact: true}).click();
  await expect(page.locator('[data-list-mode="choose"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#use-cases-title')).toHaveText('Välj slumpmässigt från din egen lista');

  await page.getByRole('link', {name: 'Slumpval', exact: true}).click();
  await page.locator('#decision-dice').click();
  await expect(page.locator('#tool-description')).toBeVisible();
  await expect(page.locator('#use-cases-title')).toHaveText('Digitala tärningar för sällskapsspel och rollspel');
  const dice = await page.locator('#tool-description').textContent();
  await page.goto('/kasta-tarning/');
  await expect(page.locator('#tool-description')).toHaveText(dice);
  await page.locator('#decision-yes').click();
  await expect(page.locator('#use-cases-title')).toHaveText('Ett slumpmässigt ja eller nej');
  await page.goBack();
  await expect(page.locator('#tool-description')).toHaveText(dice);
});

test('six-sided dice show matching pips, tumble only when unlocked and respect reduced motion', async ({page}) => {
  await page.goto('/kasta-tarning/');
  await page.locator('#dice-count').fill('12');
  await page.locator('#submit').click();
  const dice = page.locator('.die-button--six');
  await expect(dice).toHaveCount(12);
  for (const die of await dice.all()) {
    const value = Number(await die.locator('.sr-only').textContent());
    await expect(die.locator('.die-pip')).toHaveCount(value);
    await expect(die).toHaveAccessibleName(new RegExp('Tärning \\d+: ' + value));
  }
  await dice.first().click();
  await page.locator('#next-draw').click();
  expect(await dice.first().evaluate(node => node.getAnimations().length)).toBe(0);
  const frames = await dice.nth(1).evaluate(node => node.getAnimations()[0].effect.getKeyframes());
  expect(frames.some(frame => /rotate\(/.test(frame.transform || ''))).toBe(true);
  expect(frames.every(frame => !/perspective|rotate[XYZ]|matrix3d/.test(frame.transform || '') && frame.opacity === undefined)).toBe(true);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.locator('#next-draw').click();
  expect(await page.locator('#output').evaluate(node => node.getAnimations({subtree: true}).length)).toBe(0);
  await page.locator('#edit-draw').click();
  await page.locator('#dice-sides').selectOption('20');
  await page.locator('#submit').click();
  await expect(page.locator('.die-face')).toHaveCount(0);
  await expect(page.locator('.die-button').first()).toHaveText(/^\d+$/);
});
test('coin has two faces, lands on either result and skips motion when requested', async ({page}) => {
  await page.goto('/singla-slant/');
  await page.evaluate(() => { crypto.getRandomValues = values => {values.fill(0); return values;}; });
  await page.locator('#submit').click();
  const coin = page.locator('.coin');
  await expect(coin).toHaveAttribute('data-side', 'heads');
  await expect(page.locator('.coin-label')).toHaveText('Krona');
  await expect(coin.locator('.coin-face')).toHaveCount(2);
  const frames = await coin.evaluate(async node => {
    const animation = node.getAnimations()[0];
    const frames = animation.effect.getKeyframes();
    await animation.finished;
    return frames;
  });
  expect(frames[0].transform).toContain('1080deg');
  await expect(coin).toHaveCSS('transform', 'none');
  await page.evaluate(() => { crypto.getRandomValues = values => {values.fill(1); return values;}; });
  await page.locator('#next-draw').click();
  await expect(coin).toHaveAttribute('data-side', 'tails');
  await expect(page.locator('.coin-label')).toHaveText('Klave');
  await coin.evaluate(async node => {await Promise.all(node.getAnimations().map(animation => animation.finished));});
  const tailsTransform = await coin.evaluate(node => getComputedStyle(node).transform);
  expect(tailsTransform).not.toBe('none');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.locator('#next-draw').click();
  expect(await page.locator('#output').evaluate(node => node.getAnimations({subtree: true}).length)).toBe(0);
  expect(await coin.evaluate(node => getComputedStyle(node).transform)).toBe(tailsTransform);
  await expect(page.locator('#draw-announcement')).toHaveText('Slumpning 3: Klave');
});
test('coin result label stays transparent during the flip and fades in after landing', async ({page}) => {
  await page.goto('/singla-slant/');
  await page.locator('#submit').click();
  const states = await page.locator('#output').evaluate(output => {
    const coin = output.querySelector('.coin'), label = output.querySelector('.coin-label');
    const flip = coin.getAnimations()[0], fade = label.getAnimations()[0];
    flip.pause(); fade.pause();
    const landing = flip.effect.getTiming().duration;
    flip.currentTime = landing - 1; fade.currentTime = landing - 1;
    const before = getComputedStyle(label).opacity;
    flip.currentTime = landing; fade.currentTime = landing + 90;
    const during = Number(getComputedStyle(label).opacity);
    flip.finish(); fade.finish();
    return {before, during, after: getComputedStyle(label).opacity, delay: fade.effect.getTiming().delay, landing};
  });
  expect(states.before).toBe('0');
  expect(states.delay).toBe(states.landing);
  expect(states.during).toBeGreaterThan(0);
  expect(states.during).toBeLessThan(1);
  expect(states.after).toBe('1');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.locator('#next-draw').click();
  await expect(page.locator('.coin-label')).toHaveCSS('opacity', '1');
});
test('all numbered dice types spin on reroll while locked dice stay still', async ({page}) => {
  for (const sides of ['4', '8', '10', '12', '20', '100']) {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.goto('/kasta-tarning/');
    await page.locator('#dice-sides').selectOption(sides);
    await page.locator('#dice-count').fill('2');
    await page.locator('#submit').click();
    const dice = page.locator('.die-button');
    const value = await dice.first().textContent();
    await dice.first().click();
    await page.locator('#next-draw').click();
    await expect(dice.first()).toHaveText(value);
    const animation = await dice.nth(1).evaluate(node => {
      const animation = node.getAnimations()[0];
      animation.pause();
      return animation.effect.getKeyframes();
    });
    expect(animation.some(frame => /rotate\(/.test(frame.transform || ''))).toBe(true);
    expect(await dice.first().evaluate(node => node.getAnimations().length)).toBe(0);
    await expect(page.locator('.die-face')).toHaveCount(0);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.locator('#next-draw').click();
    expect(await page.locator('#output').evaluate(node => node.getAnimations({subtree: true}).length)).toBe(0);
  }
});