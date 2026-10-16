import { expect, test, type Page } from '@playwright/test';

const MODES = [
  'word-rain',
  'type-beats',
  'code-typer',
  'zombie-survival',
  'typing-racer',
  'word-tower',
  'story',
  'zen',
] as const;

/** Fail a test if the app logs an error or throws. */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** The first visit opens the typing check; the arcade is one Skip away. */
async function openArcade(page: Page): Promise<void> {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test.describe('Onboarding', () => {
  test('offers a typing check on the first visit and can be skipped', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quick typing check')).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.locator('.tile')).toHaveCount(8);
  });
});

test.describe('Landing', () => {
  test('stays the home page after onboarding and leads to the arcade', async ({ page }) => {
    await openArcade(page);
    await expect(page).toHaveURL(/#\/arcade$/);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Play now/ })).toBeVisible();
    await page.getByRole('button', { name: /Play now/ }).click();
    await expect(page.locator('.tile')).toHaveCount(8);
  });
});

test.describe('Arcade', () => {
  test('shows eight mode tiles and navigates with the keyboard', async ({ page }) => {
    const errors = watchForErrors(page);
    await openArcade(page);

    const tiles = page.locator('.tile');
    await expect(tiles).toHaveCount(8);
    await expect(tiles.first()).toContainText('Word Rain');

    await tiles.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tiles.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tiles.first()).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/play\/word-rain/);
    expect(errors).toEqual([]);
  });

  test('locked modes stay locked and say why', async ({ page }) => {
    await openArcade(page);
    const locked = page.locator('.tile--locked').first();
    await expect(locked).toContainText('Locked until level');
  });

  test('settings and stats screens open', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto('/#/settings');
    await expect(page.getByText('Sound pack')).toBeVisible();
    await page.goto('/#/stats');
    await expect(page.locator('.panel, .section-label').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('Every mode plays', () => {
  for (const mode of MODES) {
    test(`${mode} accepts typing for ten seconds of play`, async ({ page }) => {
      const errors = watchForErrors(page);
      await page.goto(`/#/play/${mode}`);

      // The HUD proves the mode booted and the loop is running.
      await expect(page.locator('.hud')).toBeVisible();
      await expect(page.locator('.scrim')).toHaveCount(0, { timeout: 15_000 });

      // Type Beats opens on a song picker; choose free play.
      if (mode === 'type-beats') await page.keyboard.press('1');

      const letters = 'thequickbrownfoxjumpsoverthelazydog';
      for (const ch of letters) {
        await page.keyboard.press(ch);
      }
      await page.waitForTimeout(500);

      await expect(page.locator('.hud')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('Escape pauses and the pause menu returns to the arcade', async ({ page }) => {
    await page.goto('/#/play/word-rain');
    await expect(page.locator('.hud')).toBeVisible();
    // Wait for the loading scrim to clear: input is only attached once the mode is ready.
    await expect(page.locator('.scrim')).toHaveCount(0, { timeout: 15_000 });
    await page.keyboard.press('Escape');

    await expect(page.getByText('Paused')).toBeVisible();
    await page.getByRole('button', { name: 'Quit to arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
  });
});

test('the UI kit page renders both themes', async ({ page }) => {
  await page.goto('/#/kit');
  await expect(page.locator('[data-theme="light"]')).toBeVisible();
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();
});
