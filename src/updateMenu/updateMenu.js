import { readFileSync, writeFileSync } from 'fs';

// Use config/paths for file locations
import { PATHS } from '../paths.js';

let menu;
try {
    const rawData = readFileSync(PATHS.mergedMenuPath, 'utf-8');
    menu = JSON.parse(rawData);
} catch (err) {
    console.error('Failed to read menu file:', err);
    process.exit(1);
}

for (const category of menu) {
    for (const subcategory of category.subCategories) {
        for (const dish of subcategory.dishes) {
            if (typeof dish.prices === 'string') {
                dish.prices = dish.prices.split(',').map(p => p.trim());
            }
            if (typeof dish.price === 'string' && !isNaN(Number(dish.price))) {
                dish.price = (Number(dish.price) * 2).toString();
            }
            if (Array.isArray(dish.prices)) {
                dish.prices = dish.prices.map(p => (Number(p) * 2).toString());
            }
        }
    }
}

try {
    writeFileSync(PATHS.mergedMenuPath, JSON.stringify(menu, null, 2), 'utf-8');
    console.log('Menu updated successfully.');
} catch (err) {
    console.error('Failed to write updated menu:', err);
}
