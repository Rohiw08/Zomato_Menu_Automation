import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";

// Use the Stealth plugin to help avoid detection
puppeteer.use(StealthPlugin());

(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false, // Must be false to interact with the login page
        userDataDir: "./user-data", // Path to store session data (cookies, local storage, etc.)
        executablePath: executablePath(), // Uses the Puppeteer-managed browser executable
        args: ['--start-maximized'] // Optional: Starts the browser maximized
    });

    // Open a new page
    const page = await browser.newPage();

    try {
        console.log("Navigating to Zomato partners login page...");
        // Navigate to the specified URL
        await page.goto(
            "https://www.zomato.com/partners/onlineordering/menu/editor?resId=20765231",
            { waitUntil: "networkidle2", timeout: 60000 } // Wait until network activity has calmed, timeout after 60s
        );
        console.log("Navigation complete.");
        console.log("----------------------------------------------------------------------------------");
        console.log("IMPORTANT: Please log in to your Zomato Partner account in the browser window.");
        console.log("Once you have successfully logged in, your session will be saved.");
        console.log("You can then manually close the browser window or stop this script (Ctrl+C).");
        console.log("The browser will remain open until this script is stopped.");
        console.log("----------------------------------------------------------------------------------");

        // Keep the script running (and browser open) indefinitely until manually stopped
        // This allows the user to perform manual login.
        await new Promise(resolve => {});

    } catch (error) {
        console.error("An error occurred during navigation or while waiting for login:");
        console.error(error);
    } finally {
        console.log("Closing the browser...");
        // Ensure the browser is closed when the script ends or if an error occurs
        // (though if manually stopped, this might not always execute as expected depending on the signal)
        if (browser && browser.isConnected()) {
            await browser.close();
        }
        console.log("Browser closed.");
    }
})();
