import fs from 'fs/promises';

async function countDishes() {
    const data = await fs.readFile('final_json_output/merged_menu.json', 'utf-8');
    const menu = JSON.parse(data);
    let count = 0;

    for (const category of menu) {
        if (!category.subCategories) continue;
        for (const sub of category.subCategories) {
            if (sub.dishes && Array.isArray(sub.dishes)) {
                count += sub.dishes.length;
            }
        }
    }
    console.log(`Total number of dishes: ${count}`);
}

countDishes();