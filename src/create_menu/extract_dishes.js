import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";
import fs from "fs";
import { config } from "../config.js";
import {
    waitForSelectorAndClick,
    shortPause,
} from "./utils.js";

// Use the stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

async function getChatGPTResponse(promptText, imagePath) {
    let browser;
    let conversationData = '';
    try {
        browser = await puppeteer.launch({
            headless: false,
            executablePath: executablePath(),
            defaultViewport: null,
            args: ['--start-maximized'],

        });

        const page = await browser.newPage();

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/backend-anon/f/conversation')) {
                try {
                    conversationData = (await response.text()).toString();
                    if (conversationData.includes("data: [DONE]")) {
                        console.log(conversationData);
                        console.log("Closing browser due to [DONE] signal."); // More descriptive message
                        if (browser) await browser.close();
                    }
                } catch (err) {
                    console.log("Error processing ChatGPT response:", err); // Added context
                }
            }
        });

        console.log("Navigating to ChatGPT...");
        await page.goto(config.chatGPTUrl); // Use config for URL

        try {
            await page.waitForSelector(config.selectors.chatGPTPromptTextarea, {
                timeout: config.timeouts.chatGPTPromptTimeout // Use config for timeout
            });
        } catch (e) {
            console.log('Prompt textarea not found. Please log in manually within the browser.');
            await page.waitForSelector(config.selectors.chatGPTPromptTextarea, {
                timeout: config.timeouts.chatGPTManualLoginTimeout // Use config for longer timeout
            });
        }

        console.log("Ready to accept prompt.");

        // Focus on the textarea
        await page.focus(config.selectors.chatGPTPromptTextarea); // Use config for selector

        // Read the image file and convert to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        // // Create the image paste functionality
        await page.evaluate((base64Image, promptTextareaSelector) => { // Pass selector to evaluate
            return new Promise((resolve, reject) => {
                try {
                    const byteCharacters = atob(base64Image);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'image/jpeg' });

                    const dt = new DataTransfer();
                    dt.items.add(new File([blob], 'page_0.jpeg', { type: 'image/jpeg' }));

                    const pasteEvent = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                        clipboardData: dt,
                    });

                    const textarea = document.querySelector(promptTextareaSelector); // Use passed selector
                    if (textarea) {
                        textarea.dispatchEvent(pasteEvent);
                        resolve();
                    } else {
                        reject('Textarea not found inside page.evaluate'); // More specific error
                    }
                } catch (error) {
                    reject(error);
                }
            });
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

        while (!conversationData.includes("data: [DONE]")) {
            await shortPause(config.timeouts.chatGPTResponsePollInterval);
        }

        return conversationData;
    } catch (err) {
        console.error('An error occurred:', err);
        return `Extraction failed: ${err.message}`;
    } finally {
        console.log("Closing browser.");
        if (browser) await browser.close();
        return conversationData;
    }
}

export { getChatGPTResponse };