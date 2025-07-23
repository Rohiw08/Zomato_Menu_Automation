// config.js
export const config = {
    loginUrl: "https://www.zomato.com/partners/onlineordering/menu/editor?resId=20765231",
    chatGPTUrl: "https://chatgpt.com/",
    timeouts: {
        navigation: 60000,
        action: 10000,
        longAction: 30000,
        debugSleep: 1000,
        chatGPTPromptTimeout: 30000, // New: Timeout for finding ChatGPT prompt textarea
        chatGPTManualLoginTimeout: 180000, // New: Longer timeout for manual login
        chatGPTImageProcessingPause: 20000, // New: Pause after image paste
        chatGPTResponsePollInterval: 500, // New: Interval for polling ChatGPT response
    },
    selectors: {
        body: "body",
        // General
        addCategoryButton: "button ::-p-text(Add Category)",
        saveChangesButton: "button ::-p-text(Save Changes)",
        discardDishButton: "xpath///button[normalize-space()='Discard']",

        // Category
        addCategoryModalButton: 'button ::-p-text(Add Category)',
        categoryNameInput: 'input[name="categoryName"]',
        categorySubmitButton: 'button[type="submit"]',

        // SubCategory
        addSubCategoryButton: 'button ::-p-text(Add Subcategory)',
        subCategoryNameInput: 'input[name="subCategoryName"]',
        defaultSubcategorySaveButton: 'button ::-p-text(Done)',
        subcategorySaveButton: 'button ::-p-text(Done)',

        // Dish
        addNewItemButtonInitial: "button ::-p-text(Add new item)",
        addNewItemButtonSubsequent: "button ::-p-text(Add New Item)",
        itemNameInput: 'input[id="item-name"]',
        basicDetailsTab: 'div ::-p-text(Basic Details)',
        itemDescriptionTextarea: 'textarea[placeholder="Add a detailed description explaining the dish"]',
        itemPriceInput: 'input[id="item-price"]',
        variantsTab: "div ::-p-text(Variants)",
        createNewVariantButton: "div ::-p-text(Create a new variant)",
        addNewPropertyButton: "div ::-p-text(Add new property)",
        variantNameInput: 'input[placeholder="Enter variant name E.g. Size, crust, "]',
        variantOptionInput: 'input[placeholder="Enter your base variant, Eg: small"]',
        enterPricesAndReviewButton: "button ::-p-text(Enter prices and review)",
        variantPriceInput: 'input[placeholder="Enter price"]',
        saveVariantButton: "button ::-p-text(Save)",
        nutritionalInfoTab: "div ::-p-text(Nutritional Info Per Serving)",
        nutritionWeightInput: 'input[id="Weight per serving"]',
        nutritionProteinInput: 'input[id="Protein count"]',
        nutritionCarbsInput: 'input[id="Carbohydrates count"]',
        nutritionFatInput: 'input[id="Fat count"]',
        nutritionFiberInput: 'input[id="Fibre count"]',

        // submit
        submitChangesButton: "button ::-p-text(Submit Changes)",
        confirmSubmission: "button ::-p-text(Yes, I confirm)",

        // ChatGPT Selectors (NEW)
        chatGPTPromptTextarea: '#prompt-textarea',
        chatGPTSubmitButton: '#composer-submit-button'
    },
    // Function to get dynamic selectors
    getVariantOptionAddButtonSelector: (variantType) => `div ::-p-text(Add new ${variantType})`,
    getCategoryLabelSelector: (categoryName) => `label ::-p-text(${categoryName})`,

};