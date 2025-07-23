import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";

// Use the Stealth plugin to help avoid detection
puppeteer.use(StealthPlugin());

(async () => {

    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./user-data",
        executablePath: executablePath(),
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        console.log("Navigating to Zomato partners login page...");
        await page.goto(
            "https://www.zomato.com/partners/onlineordering/menu/editor?resId=20765231",
            { waitUntil: "networkidle2", timeout: 60000 }
        );
        console.log("Navigation complete.");
        console.log("----------------------------------------------------------------------------------");
        console.log("IMPORTANT: Please log in to your Zomato Partner account in the browser window.");
        console.log("Once you have successfully logged in, press ENTER in this terminal to close the browser.");
        console.log("----------------------------------------------------------------------------------");

        // Wait for user to press ENTER
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async () => {
            console.log("Closing the browser...");
            if (browser?.process() !== null) {
                await browser.close();
            }
            console.log("Browser closed.");
            process.exit(0);
        });

    } catch (error) {
        console.error("An error occurred during navigation or while waiting for login:");
        console.error(error);
        if (browser?.process() !== null) {
            await browser.close();
        }
        process.exit(1);
    }
})();
