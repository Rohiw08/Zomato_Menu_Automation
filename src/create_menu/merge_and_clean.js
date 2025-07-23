import fs from 'fs/promises';
import path from 'path';

const __filename = new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'); // Remove leading slash on Windows
const projectRoot = path.resolve(path.dirname(__filename), '../..');
const EXTRACTED_INFO_DIR = path.join(projectRoot, 'extracted_info');
const OUTPUT_PATH = path.join(projectRoot, 'final_json_output/merged_menu.json');

function normalize(str) {
    return str ? str.trim().toLowerCase() : '';
}

function mergeDishes(existing, incoming) {
    // Remove exact duplicates by name (case-insensitive, trimmed)
    const seen = new Map();
    for (const dish of [...existing, ...incoming]) {
        const key = normalize(dish.name);
        if (!seen.has(key)) {
            seen.set(key, dish);
        }
    }
    return Array.from(seen.values());
}

function mergeSubcategories(existing, incoming) {
    const merged = [...existing];
    for (const incSub of incoming) {
        const idx = merged.findIndex(
            sub => normalize(sub.subcategory) === normalize(incSub.subcategory)
        );
        if (idx !== -1) {
            merged[idx].dishes = mergeDishes(merged[idx].dishes, incSub.dishes);
        } else {
            merged.push(incSub);
        }
    }
    return merged;
}

function mergeCategories(existing, incoming) {
    const merged = [...existing];
    for (const incCat of incoming) {
        const idx = merged.findIndex(
            cat => normalize(cat.category) === normalize(incCat.category)
        );
        if (idx !== -1) {
            merged[idx].subCategories = mergeSubcategories(
                merged[idx].subCategories,
                incCat.subCategories
            );
        } else {
            merged.push(incCat);
        }
    }
    return merged;
}

async function optimizeJson() {
    const files = await fs.readdir(EXTRACTED_INFO_DIR);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    let mergedMenu = [];
    let validFiles = 0;
    let skippedFiles = 0;

    for (const file of txtFiles) {
        const filePath = path.join(EXTRACTED_INFO_DIR, file);
        let content;
        try {
            content = await fs.readFile(filePath, 'utf-8');
            // Try to parse as JSON
            const json = JSON.parse(content);
            if (!Array.isArray(json)) {
                console.warn(`⚠️  File ${file} does not contain a top-level array. Skipping.`);
                skippedFiles++;
                continue;
            }
            mergedMenu = mergeCategories(mergedMenu, json);
            validFiles++;
        } catch (e) {
            console.warn(`⚠️  File ${file} is not valid JSON. Skipping.`);
            skippedFiles++;
        }
    }

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(mergedMenu, null, 2), 'utf-8');
    console.log(`✅ Merged menu written to ${OUTPUT_PATH}`);
    console.log(`Processed ${validFiles} valid files, skipped ${skippedFiles} invalid files.`);
}

optimizeJson();

export { optimizeJson };