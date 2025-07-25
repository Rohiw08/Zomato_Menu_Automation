import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";
import fs from "fs";
import { config } from "../config.js";
import { waitForSelectorAndClick, shortPause } from "./utils.js";

puppeteer.use(StealthPlugin());

async function getChatGPTResponse(promptText, imagePath) {
    let browser;
    let page;
    let conversationData = '';
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    while (attempts < MAX_ATTEMPTS) {
        try {
            browser = await puppeteer.launch({
                headless: true,
                executablePath: executablePath(),
                defaultViewport: null,
                args: ['--start-maximized'],
            });

            page = await browser.newPage();

            page.on('response', async (response) => {
                const url = response.url();
                if (url.includes('/backend-anon/f/conversation')) {
                    try {
                        const text = await response.text();
                        conversationData += text;
                    } catch (err) {
                        console.log("Error capturing response text:", err.message);
                    }
                }
            });

            console.log("Navigating to ChatGPT...");
            await page.goto(config.chatGPTUrl);

            try {
                await page.waitForSelector(config.selectors.chatGPTPromptTextarea, {
                    timeout: config.timeouts.chatGPTPromptTimeout,
                });
            } catch {
                console.log("Prompt textarea not found. Waiting for manual login...");
                await page.waitForSelector(config.selectors.chatGPTPromptTextarea, {
                    timeout: config.timeouts.chatGPTManualLoginTimeout,
                });
            }

            console.log("Ready to accept prompt.");
            break;
        } catch (err) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, err.message);
            if (browser?.process() !== null) await browser.close();
            if (attempts >= MAX_ATTEMPTS) {
                throw new Error(`Failed after ${MAX_ATTEMPTS} attempts`);
            }
        }
    }

    await page.focus(config.selectors.chatGPTPromptTextarea);

    // Upload image to prompt via clipboard simulation
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    await page.evaluate(async (base64Image, selector) => {
        const byteCharacters = atob(base64Image);
        const byteArray = new Uint8Array([...byteCharacters].map(char => char.charCodeAt(0)));
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const dt = new DataTransfer();
        dt.items.add(new File([blob], 'menu.jpg', { type: 'image/jpeg' }));

        const event = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
        });

        const textarea = document.querySelector(selector);
        if (textarea) textarea.dispatchEvent(event);
    }, base64Image, config.selectors.chatGPTPromptTextarea);

    await shortPause(1000);

    await page.evaluate((promptTextareaSelector, promptText) => {
            const textarea = document.querySelector(promptTextareaSelector);
            if (!textarea) throw new Error("Textarea not found");

            const dt = new DataTransfer();
            dt.setData('text/plain', promptText);

            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt,
            });

            textarea.focus();
            textarea.dispatchEvent(pasteEvent);
        }, config.selectors.chatGPTPromptTextarea, promptText);

        // Wait for submit button to be enabled and visible
        await page.waitForFunction(() => {
            const btn = document.querySelector('#composer-submit-button');
            return btn && !btn.disabled && btn.offsetParent !== null;
        }, { timeout: 30000 }); // timeout = how long you're willing to wait for image upload
    
    // Click the button
    await waitForSelectorAndClick(page, config.selectors.chatGPTSubmitButton, "Click submit button");
    console.log("✅ Submit button clicked after image upload.");
    
    // Wait for conversation data to complete
    while (!conversationData.includes("data: [DONE]")) {
        await shortPause(config.timeouts.chatGPTResponsePollInterval);
    }

    if (browser?.process() !== null) await browser.close();

    return conversationData;
}

export { getChatGPTResponse };
