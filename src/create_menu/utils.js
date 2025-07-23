import { config } from "../config.js";

/**
 * A very small, deliberate pause for UI rendering quirks.
 * @param {number} duration - Duration in milliseconds (default to a very small value).
 */
export async function verySmallPause(duration = 300) { // Default to 50ms, can be adjusted in config if needed
    await new Promise((resolve) => setTimeout(resolve, duration));
    await new Promise((resolve) => setTimeout(resolve, duration || config.timeouts.debugSleep));
}

/**
 * Waits for a selector to be visible and then clicks it.
 * @param {import("puppeteer").Page} page - The Puppeteer page object.
 * @param {string} selector - The selector to click.
 * @param {string} [description="element"] - Optional description for logging.
 */
export async function waitForSelectorAndClick(page, selector, description = "element") {
    try {
        await verySmallPause();
        await page.waitForSelector(selector, { visible: true, timeout: config.timeouts.action });
        await verySmallPause(); // Added small delay before clicking
        await page.locator(selector).click();
        console.log(`✅ Clicked ${description} (selector: ${selector})`);
    } catch (error) {
        console.error(`❌ Error clicking ${description} with selector ${selector}:`, error.message, { selector, description });
        throw error;
    }
}

/**
 * Waits for an input selector to be visible and then fills it.
 * @param {import("puppeteer").Page} page - The Puppeteer page object.
 * @param {string} selector - The selector for the input field.
 * @param {string} value - The value to fill.
 * @param {string} [description="input field"] - Optional description for logging.
 */
export async function waitForSelectorAndFill(page, selector, value, description = "input field") {
    try {
        await verySmallPause();
        await page.waitForSelector(selector, { visible: true, timeout: config.timeouts.action });
        await verySmallPause();
        await page.locator(selector).fill(value);
        console.log(`✅ Filled ${description} (selector: ${selector}) with value: "${value}"`);
    } catch (error) {
        console.error(`❌ Error filling ${description} with selector ${selector}:`, error.message, { selector, value, description });
        throw error;
    }
}


/**
 * Waits for a selector to be hidden or removed from the DOM.
 * Excellent for waiting for modals to close or loading spinners to disappear.
 * @param {import("puppeteer").Page} page - The Puppeteer page object.
 * @param {string} selector - The selector to wait for.
 * @param {string} [description="element"] - Optional description for logging.
 */
export async function waitForSelectorToBeHidden(page, selector, description = "element") {
    try {
        await page.waitForSelector(selector, { hidden: true, timeout: config.timeouts.longAction });
        console.log(`✅ ${description} (selector: ${selector}) is now hidden.`);
    } catch (error) {
        console.error(`❌ Error waiting for ${description} to be hidden (selector: ${selector}):`, error.message, { selector, description });
        throw error;
    }
}

/**
 * A short, deliberate pause. Use sparingly.
 * @param {number} duration - Duration in milliseconds.
 */
export async function shortPause(duration = config.timeouts.debugSleep) {
    await new Promise((resolve) => setTimeout(resolve, duration));
}