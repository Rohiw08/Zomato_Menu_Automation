import { readFileSync, writeFileSync } from 'fs';

// Step 1: Read the file
const rawData = readFileSync('updateMenu/demoMenu.json', 'utf-8');
const menu = JSON.parse(rawData);

// Step 2: Update prices
// for (const category of menu) {
//     for (const subcategory of category.subCategories) {
//         for (const dish of subcategory.dishes) {
//             if ("price" in dish) {
//                 dish.price =(Number(dish.price) * 2).toString();
//             } else if ("prices" in dish && Array.isArray(dish.prices)) {
//                 dish.prices = dish.prices.map(p => (Number(p) * 2).toString());
//             }
//         }
//     }
// }

for (const category of menu) {
    for (const subcategory of category.subCategories) {
        for (const dish of subcategory.dishes) {
            if ("prices" in dish) {
                dish.prices = dish.prices
                    .split(",")
                    .map(p => p.trim());
            }
        }
    }
}


// Step 3: Write the updated data back to the file
writeFileSync('updateMenu/demoMenu.json', JSON.stringify(menu, null, 2), 'utf-8');

console.log("Menu updated successfully.");
