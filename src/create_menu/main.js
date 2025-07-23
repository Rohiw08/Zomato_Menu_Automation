import fs from 'fs/promises';
import path from 'path';
import { processInputFile } from './pdf_to_image.js';
import { getChatGPTResponse } from './extract_dishes.js';
import { extractJsonFromSSE } from './info_parser.js';
import { optimizeJson } from './merge_and_clean.js';
import { PATHS } from '../paths.js';

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch { }
}

async function getPrompt() {
    return fs.readFile(PATHS.promptPath, 'utf-8');
}

async function main() {
    await ensureDir(PATHS.extractedImagesDir);
    await ensureDir(PATHS.extractedInfoDir);

    // 1. Gather all PDFs and images in input_file
    const files = await fs.readdir(PATHS.inputDir);
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const images = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    let imageIndex = 0;

    // 2. Process all PDFs
    for (const pdf of pdfs) {
        const pdfPath = path.join(PATHS.inputDir, pdf);
        await processInputFile(pdfPath, PATHS.extractedImagesDir, true);
        // Rename images to continue sequence
        const outImages = (await fs.readdir(PATHS.extractedImagesDir))
            .filter(f => /page-\d+\.(jpg|jpeg|png)$/i.test(f))
            .sort((a, b) => {
                const getNum = s => parseInt(s.match(/page-(\d+)/)[1], 10);
                return getNum(a) - getNum(b);
            });
        for (const img of outImages) {
            const ext = path.extname(img);
            const newName = `page-${imageIndex}${ext}`;
            await fs.rename(path.join(PATHS.extractedImagesDir, img), path.join(PATHS.extractedImagesDir, newName));
            imageIndex++;
        }
    }

    // 3. Move all images from input_file to EXTRACTED_IMAGES_DIR, continuing sequence
    for (const img of images) {
        const ext = path.extname(img);
        const newName = `page-${imageIndex}${ext}`;
        await fs.copyFile(path.join(PATHS.inputDir, img), path.join(PATHS.extractedImagesDir, newName));
        await fs.unlink(path.join(PATHS.inputDir, img));
        imageIndex++;
    }

    // 4. For each image in EXTRACTED_IMAGES_DIR, run extraction and save output
    const prompt = await getPrompt();
    const extractedImages = (await fs.readdir(PATHS.extractedImagesDir))
        .filter(f => /page-\d+\.(jpg|jpeg|png)$/i.test(f))
        .sort((a, b) => {
            const getNum = s => parseInt(s.match(/page-(\d+)/)[1], 10);
            return getNum(a) - getNum(b);
        });

    for (const img of extractedImages) {
        const imgPath = path.join(PATHS.extractedImagesDir, img);
        const txtName = img.replace(/\.(jpg|jpeg|png)$/i, '.txt');
        const txtPath = path.join(PATHS.extractedInfoDir, txtName);
        let result = '';
        const MAX_ATTEMPTS = 5;
        let attempt = 0;
        let success = false;

        while (attempt < MAX_ATTEMPTS && !success) {
            attempt++;
            try {
                console.log(`🔄 Attempt ${attempt} for ${img}`);
                result = await getChatGPTResponse(prompt, imgPath);

                if (result && result.includes('data: [DONE]')) {
                    try {
                        const json = await extractJsonFromSSE(result);
                        if (json) {
                            await fs.writeFile(txtPath, JSON.stringify(json, null, 2), 'utf-8');
                            console.log(`✅ Processed and saved JSON for: ${img}`);
                            success = true;
                        } else {
                            await fs.writeFile(txtPath, result, 'utf-8');
                            console.log(`✅ Processed and saved raw output for: ${img}`);
                            success = true;
                        }
                    } catch (err) {
                        console.error(`❌ Error processing ${img}:`, err.message);
                    }
                }

                if (!success) {
                    await new Promise(res => setTimeout(res, 1000));
                }
            } catch (e) {
                console.log(`❌ Attempt ${attempt} failed for ${img}: ${e.message}`);
                if (attempt === MAX_ATTEMPTS) {
                    result = `Extraction failed after ${MAX_ATTEMPTS} attempts: ${e.message}`;
                    await fs.writeFile(txtPath, result, 'utf-8');
                }
            }
        }
    }

    // Clean up images
    for (const img of await fs.readdir(PATHS.extractedImagesDir)) {
        await fs.unlink(path.join(PATHS.extractedImagesDir, img));
    }

    await optimizeJson();

    console.log('Processing complete. Extracted info saved in extracted_info/.');
}

main().catch(e => {
    console.error('Fatal error in main.js:', e);
    process.exit(1);
});