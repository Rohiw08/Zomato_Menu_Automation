import fs from 'fs/promises';
import path from 'path';
import { processInputFile } from './pdf_to_image.js';
import { getChatGPTResponse } from './extract_dishes.js';
import { extractTextFromSSE, parseJson } from './info_parser.js';
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
    let files;
    try {
        files = await fs.readdir(PATHS.inputDir);
    } catch (err) {
        console.error(`❌ Failed to read input directory: ${PATHS.inputDir}`, err);
        return;
    }
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const images = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    let imageIndex = 0;

    // 2. Process all PDFs
    for (const pdf of pdfs) {
        const pdfPath = path.join(PATHS.inputDir, pdf);
        try {
            await processInputFile(pdfPath, PATHS.extractedImagesDir, true);
        } catch (err) {
            console.error(`❌ Failed to process PDF: ${pdfPath}`, err);
            continue;
        }
        // Rename images to continue sequence
        let outImages;
        try {
            outImages = (await fs.readdir(PATHS.extractedImagesDir))
                .filter(f => /page-\d+\.(jpg|jpeg|png)$/i.test(f))
                .sort((a, b) => {
                    const getNum = s => parseInt(s.match(/page-(\d+)/)[1], 10);
                    return getNum(a) - getNum(b);
                });
        } catch (err) {
            console.error(`❌ Failed to read extracted images directory: ${PATHS.extractedImagesDir}`, err);
            continue;
        }
        for (const img of outImages) {
            const ext = path.extname(img);
            const newName = `page-${imageIndex}${ext}`;
            try {
                await fs.rename(path.join(PATHS.extractedImagesDir, img), path.join(PATHS.extractedImagesDir, newName));
            } catch (err) {
                console.error(`❌ Failed to rename image: ${img}`, err);
            }
            imageIndex++;
        }
    }

    // 3. Move all images from input_file to EXTRACTED_IMAGES_DIR, continuing sequence
    for (const img of images) {
        const ext = path.extname(img);
        const newName = `page-${imageIndex}${ext}`;
        try {
            await fs.copyFile(path.join(PATHS.inputDir, img), path.join(PATHS.extractedImagesDir, newName));
            await fs.unlink(path.join(PATHS.inputDir, img));
        } catch (err) {
            console.error(`❌ Failed to move image: ${img}`, err);
        }
        imageIndex++;
    }

    // 4. For each image in EXTRACTED_IMAGES_DIR, run extraction and save output
    let prompt;
    try {
        prompt = await getPrompt();
    } catch (err) {
        console.error(`❌ Failed to read prompt file: ${PATHS.promptPath}`, err);
        return;
    }
    let extractedImages;
    try {
        extractedImages = (await fs.readdir(PATHS.extractedImagesDir))
            .filter(f => /page-\d+\.(jpg|jpeg|png)$/i.test(f))
            .sort((a, b) => {
                const getNum = s => parseInt(s.match(/page-(\d+)/)[1], 10);
                return getNum(a) - getNum(b);
            });
    } catch (err) {
        console.error(`❌ Failed to read extracted images directory: ${PATHS.extractedImagesDir}`, err);
        return;
    }

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
                        const extractedText = await extractTextFromSSE(result);
                        const json = await parseJson(extractedText);
                        if (json) {
                            await fs.writeFile(txtPath, JSON.stringify(json, null, 2), 'utf-8');
                            console.log(`✅ Processed and saved JSON for: ${img}`);
                            success = true;
                        } else {
                            await fs.writeFile(txtPath, extractedText, 'utf-8');
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
    try {
        for (const img of await fs.readdir(PATHS.extractedImagesDir)) {
            await fs.unlink(path.join(PATHS.extractedImagesDir, img));
        }
    } catch (err) {
        console.error(`❌ Failed to clean up extracted images:`, err);
    }

    try {
        await optimizeJson();
    } catch (err) {
        console.error(`❌ Failed to optimize JSON:`, err);
    }

    console.log('Processing complete. Extracted info saved in extracted_info/.');
}

main().catch(e => {
    console.error('Fatal error in main.js:', e);
    process.exit(1);
});
