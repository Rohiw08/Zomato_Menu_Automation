import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";
import { config } from "../config.js";
import { 
    waitForSelectorAndClick, 
    waitForSelectorAndFill,
    waitForSelectorToBeHidden,
    shortPause,
} from "./utils.js";

puppeteer.use(StealthPlugin());

const failedDishes = []; // Ensure this is accessible in the scope where addDish is called

async function addDish(page, dish, index, categoryName, subcategoryName) {
    console.log(`--- Attempting to add dish: ${dish.name} ---`);
    let isModalOpen = false; // Flag to track if the dish modal is expected to be open

    try {
        const addItemButtonSelector = index === 0 ? config.selectors.addNewItemButtonInitial : config.selectors.addNewItemButtonSubsequent;
        await waitForSelectorAndClick(page, addItemButtonSelector, `"Add new item" button for ${dish.name}`);
        
        // Wait for the modal to fully load by waiting for the name input to be visible and interactive
        await page.waitForSelector(config.selectors.itemNameInput, { visible: true, timeout: config.timeouts.action });
        isModalOpen = true; // Modal is now open

        // Basic Details Tab
        await waitForSelectorAndFill(page, config.selectors.itemNameInput, dish.name, "Dish name");
        await waitForSelectorAndClick(page, config.selectors.body, "just click to unfocus"); // Unfocus if necessary

        await waitForSelectorAndClick(page, config.selectors.basicDetailsTab, "Basic Details tab");
        await page.waitForSelector(config.selectors.itemDescriptionTextarea, { visible: true, timeout: config.timeouts.action });
        await waitForSelectorAndFill(page, config.selectors.itemDescriptionTextarea, dish.description, "Dish description");

        // Category selection
        const categoryLabelSelector = config.getCategoryLabelSelector(dish.category);
        await waitForSelectorAndClick(page, categoryLabelSelector, `Category label "${dish.category}"`);

        // Price or Variants
        if ("price" in dish && dish.price > 0) {
            await waitForSelectorAndFill(page, config.selectors.itemPriceInput, dish.price.toString(), "Dish price");
        } else {
            await waitForSelectorAndClick(page, config.selectors.variantsTab, "Variants tab");
            await shortPause(config.timeouts.short); 
            await waitForSelectorAndClick(page, config.selectors.createNewVariantButton, "Create new variant button");
            await shortPause(config.timeouts.short); 
            await waitForSelectorAndClick(page, config.selectors.addNewPropertyButton, "Add new property button");
            await shortPause(config.timeouts.short); 

            await waitForSelectorAndFill(page, config.selectors.variantNameInput, dish.variantType, "Variant type name");
            await page.keyboard.press("Enter");
            await shortPause(config.timeouts.short); 

            for (const variantOption of dish.variants) {
                const addVariantOptionSelector = config.getVariantOptionAddButtonSelector(dish.variantType);
                await waitForSelectorAndClick(page, addVariantOptionSelector, `Add new ${dish.variantType} option button`);
                await shortPause(config.timeouts.short); 
            }
            
            const variantInputElements = await page.$$(config.selectors.variantOptionInput);
            if (variantInputElements.length < dish.variants.length) {
                console.warn(`⚠️ Expected ${dish.variants.length} variant option inputs, found ${variantInputElements.length}. Some variant options might be missing for dish: ${dish.name}.`);
            }
            for (let i = 0; i < Math.min(variantInputElements.length, dish.variants.length); i++) {
                await variantInputElements[i].focus();
                await variantInputElements[i].type(dish.variants[i]);
                console.log(`Filled variant option "${dish.variants[i]}"`);
                await shortPause(config.timeouts.short);
            }

            await waitForSelectorAndClick(page, config.selectors.enterPricesAndReviewButton, "Enter prices and review button");
            await shortPause(config.timeouts.short);

            const priceInputBoxes = await page.$$(config.selectors.variantPriceInput);
            if (priceInputBoxes.length < dish.prices.length) {
                console.warn(`⚠️ Expected ${dish.prices.length} variant price inputs, found ${priceInputBoxes.length}. Some variant prices might be missing for dish: ${dish.name}.`);
            }
            for (let i = 0; i < Math.min(priceInputBoxes.length, dish.prices.length); i++) {
                await priceInputBoxes[i].focus();
                await priceInputBoxes[i].type(dish.prices[i].toString());
                console.log(`Filled variant price "${dish.prices[i]}"`);
                await shortPause(config.timeouts.short);
            }
            await waitForSelectorAndClick(page, config.selectors.saveVariantButton, "Save variant button");
            await shortPause(config.timeouts.short);
        }

        // Nutritional Info Tab
        if ("nutrition" in dish && dish.nutrition) { // Ensure nutrition object exists
            await waitForSelectorAndClick(page, config.selectors.nutritionalInfoTab, "Nutritional Info tab");
            await page.waitForSelector(config.selectors.nutritionWeightInput, { visible: true, timeout: config.timeouts.action });
            
            console.log("Filling nutrition details:", dish.nutrition);
            await waitForSelectorAndFill(page, config.selectors.nutritionWeightInput, dish.nutrition.weight.toString(), "Nutrition weight");
            await waitForSelectorAndFill(page, config.selectors.nutritionProteinInput, dish.nutrition.protein.toString(), "Nutrition protein");
            await waitForSelectorAndFill(page, config.selectors.nutritionCarbsInput, dish.nutrition.carbohydrates.toString(), "Nutrition carbohydrates");
            await waitForSelectorAndFill(page, config.selectors.nutritionFatInput, dish.nutrition.fat.toString(), "Nutrition fat");
            await waitForSelectorAndFill(page, config.selectors.nutritionFiberInput, dish.nutrition.fiber.toString(), "Nutrition fiber");
        }

        await waitForSelectorAndClick(page, config.selectors.saveChangesButton, "Save Changes button for dish");
        
        // Wait for the dish creation modal to disappear
        await waitForSelectorToBeHidden(page, config.selectors.itemNameInput, "Dish creation modal");
        isModalOpen = false; // Modal is now closed

        console.log(`✅ Successfully added dish: ${dish.name}`);

    } catch (error) {
        console.error(`❌ Error adding dish: ${dish.name}`);
        console.error("Error details:", error);
        
        // Add failed dish to the tracking array
        failedDishes.push({
            dishName: dish.name,
            category: categoryName,
            subcategory: subcategoryName,
            error: error.message,
            stack: error.stack // Include stack trace for better debugging
        });
        
        // Attempt to close the dish submission modal using discard button if it's believed to be open
        if (isModalOpen) {
            try {
                console.log(`🔄 Attempting to close dish modal for failed dish: ${dish.name} using discard.`);
                await waitForSelectorAndClick(page, config.selectors.discardDishButton, "Discard dish button");
                await waitForSelectorToBeHidden(page, config.selectors.itemNameInput, "Dish creation modal after discard");
                isModalOpen = false; // Modal successfully closed
                console.log(`✅ Successfully closed dish modal for: ${dish.name}`);
            } catch (discardError) {
                console.error(`❌ Failed to close dish modal for ${dish.name} using discard:`, discardError.message);
                
                // If discard fails, try to take a screenshot for debugging
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const screenshotPath = `discard_error_${dish.name}_${timestamp}.png`;
                try {
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`📸 Discard error screenshot saved to ${screenshotPath}`);
                } catch (ssError) {
                    console.error("Failed to take discard error screenshot:", ssError);
                }

                // As a last resort, if modal is still open, try to close it by pressing Escape or reloading
                console.log(`Trying alternative recovery for ${dish.name}: pressing Escape or reloading page.`);
                try {
                    await page.keyboard.press('Escape'); // Try to close any active modal
                    await shortPause(config.timeouts.short);
                    // Check if modal is gone. If not, reload.
                    const modalStillVisible = await page.$(config.selectors.itemNameInput) !== null;
                    if (modalStillVisible) {
                        console.warn(`Modal still visible after Escape for ${dish.name}. Attempting page reload.`);
                        await page.reload({ waitUntil: 'networkidle2' }); // Reload the page to clear state
                        isModalOpen = false; // Assume modal is gone after reload
                    } else {
                        console.log(`Modal closed with Escape for ${dish.name}.`);
                    }
                } catch (recoveryError) {
                    console.error(`❌ Further recovery attempt failed for ${dish.name}:`, recoveryError.message);
                }
            }
        } else {
            console.log(`ℹ️ Dish modal for ${dish.name} was not detected as open, skipping discard attempt.`);
            // If the error occurred before the modal opened, or after it was supposed to close,
            // we might not need to try discarding.
        }
        
        console.log(`⚠️ Skipping dish: ${dish.name} and continuing with the next one...`);
    }
}

async function addCategory(page, categoryName) {
    console.log(`--- Adding category: ${categoryName} ---`);
    try {
        await waitForSelectorAndClick(page, config.selectors.addCategoryModalButton, `"Add Category" button in modal for ${categoryName}`);
        // Wait for the category name input to be visible in the modal
        await page.waitForSelector(config.selectors.categoryNameInput, { visible: true, timeout: config.timeouts.action });
        await waitForSelectorAndFill(page, config.selectors.categoryNameInput, categoryName, "Category name");
        await waitForSelectorAndClick(page, config.selectors.body, "just click");
        await waitForSelectorAndClick(page, config.selectors.categorySubmitButton, "Submit category button");
        // Wait for the category modal to close
        await waitForSelectorToBeHidden(page, config.selectors.categoryNameInput, "Category modal");
        console.log(`✅ Successfully submitted category: ${categoryName}`);
    } catch (error) {
        console.error(`❌ Error adding category: ${categoryName}`);
        console.error(error);
        throw error;
    }
}

async function addSubcategory(page, subCategoryName, isDefault) {
    console.log(`--- Adding subcategory: ${subCategoryName} (Default: ${isDefault}) ---`);
    try {
        if (!isDefault) {
            await waitForSelectorAndClick(page, config.selectors.addSubCategoryButton, `"Add Subcategory" button for ${subCategoryName}`);
            await page.waitForSelector(config.selectors.subCategoryNameInput, { visible: true, timeout: config.timeouts.action });
        }
        await waitForSelectorAndFill(page, config.selectors.subCategoryNameInput, subCategoryName, "Subcategory name");
        await waitForSelectorAndClick(page, config.selectors.body, "just click");
        const saveButtonSelector = isDefault ? config.selectors.defaultSubcategorySaveButton : config.selectors.subcategorySaveButton;
        await waitForSelectorAndClick(page, saveButtonSelector, `Save subcategory button for ${subCategoryName}`);
        await waitForSelectorToBeHidden(page, config.selectors.subCategoryNameInput, "Subcategory modal");
        console.log(`✅ Successfully submitted subcategory: ${subCategoryName}`);
    } catch (error) {
        console.error(`❌ Error adding sub-category: ${subCategoryName}`);
        console.error(error);
        throw error;
    }
}

async function submitMenu(page) {
    console.log("--- Submitting all menu changes ---");
    try {
        await waitForSelectorAndClick(page, config.selectors.submitChangesButton, `Menu Submiting`);
        // Wait for confirmation modal or a specific element to confirm submission
        await page.waitForSelector(config.selectors.confirmSubmission, { visible: true, timeout: config.timeouts.action });
        await waitForSelectorAndClick(page, config.selectors.confirmSubmission, `Menu Submitted Successfully`);
        // Wait for submission confirmation to disappear (e.g., the confirmation modal itself)
        await waitForSelectorToBeHidden(page, config.selectors.confirmSubmission, "Submission confirmation modal"); 
        console.log("✅ Menu submitted successfully!");
    } catch (error) {
        console.error("❌ An error occurred during final submission:", error);
        throw error;
    }
}

function printFailedDishes() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 FAILED DISHES SUMMARY");
    console.log("=".repeat(60));
    
    if (failedDishes.length === 0) {
        console.log("🎉 No failed dishes! All dishes were added successfully.");
    } else {
        console.log(`❌ Total failed dishes: ${failedDishes.length}\n`);
        
        failedDishes.forEach((failedDish, index) => {
            console.log(`${index + 1}. Dish: "${failedDish.dishName}"`);
            console.log(`   Category: ${failedDish.category}`);
            console.log(`   Subcategory: ${failedDish.subcategory}`);
            console.log(`   Error: ${failedDish.error}`);
            console.log("");
        });
    }
    console.log("=".repeat(60));
}

async function craeteMenu(menu) {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./user-data",
        executablePath: executablePath(),
        args: ['--start-maximized'],
    });

    const page = await browser.newPage();

    try {
        console.log("Navigating to Zomato partners menu editor...");
        await page.goto(config.loginUrl);

        // Wait for the main page to be ready by looking for the 'Add Category' button
        await page.waitForSelector(config.selectors.addCategoryButton, { visible: true, timeout: config.timeouts.longAction });
        console.log("✅ Editor page loaded.");

        // Main loop to add categories, subcategories, and dishes
        for (const categoryData of menu) {
            // Click the main button to open the "Add Category" modal each time
            await waitForSelectorAndClick(page, config.selectors.addCategoryButton, "Initial 'Add Category' button");
            await addCategory(page, categoryData.category);

            for (const [index, subCategoryData] of categoryData.subCategories.entries()) {
                const isDefaultSubcategory = index === 0;
                await addSubcategory(page, subCategoryData.subcategory, isDefaultSubcategory);

                for (const [dishIndex, dishData] of subCategoryData.dishes.entries()) {
                    await addDish(page, dishData, dishIndex, categoryData.category, subCategoryData.subcategory);
                }
            }
        }

        // Submit the menu ONCE after all items have been added
        await submitMenu(page);
        console.log("🎉 All menu items processed successfully!");

    } catch (error) {
        console.error("❌ A critical error occurred in the main process. The script will now exit.");
        console.error(error);
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const screenshotPath = `error_screenshot_${timestamp}.png`;
        try {
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot saved to ${screenshotPath}`);
        } catch (ssError) {
            console.error("Failed to take screenshot:", ssError);
        }
    } finally {
        // Print failed dishes summary before closing
        printFailedDishes();
        
        console.log("Processing finished. Closing the browser in 15 seconds...");
        await shortPause(15000); 
        await browser.close();
        console.log("Browser closed.");
    }
}

export { craeteMenu };