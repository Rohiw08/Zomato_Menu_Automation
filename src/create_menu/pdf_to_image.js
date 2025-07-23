import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from 'pdf-poppler';
import fs from 'fs/promises'; // Use fs/promises for async file operations
import fsSync from 'fs';      // For existsSync, which is synchronous

// Determine the base directory for 'poppler-24.08.0' relative to this script
const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);
const frontEndAutomationDir = path.resolve(currentDir, '..', '..'); // Assuming this structure

// Poppler binary path is usually relative to your project's root or node_modules
const POPPLER_BIN_PATH = path.join(frontEndAutomationDir, 'poppler-24.08.0', 'Library', 'bin');

/**
 * Clears all files from a given directory.
 * If the directory does not exist, it will be created.
 * @param {string} directoryPath The path to the directory to clear.
 */
async function clearDirectory(directoryPath) {
    try {
        await fs.access(directoryPath); // Check if directory exists
        const files = await fs.readdir(directoryPath);
        if (files.length === 0) {
            console.log(`Directory '${directoryPath}' is already empty.`);
            return;
        }
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            await fs.unlink(filePath); // Delete each file
        }
        console.log(`Cleared directory: ${directoryPath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Output directory '${directoryPath}' does not exist, creating it.`);
            // Create the directory if it doesn't exist
            try {
                await fs.mkdir(directoryPath, { recursive: true });
                console.log(`Created directory: ${directoryPath}`);
            } catch (mkdirError) {
                console.error(`Error creating directory ${directoryPath}:`, mkdirError);
                throw mkdirError; // Re-throw if creation fails
            }
        } else {
            console.error(`Error clearing directory ${directoryPath}:`, error);
            throw error; // Re-throw other errors
        }
    }
}

/**
 * Processes an input file (PDF or image), extracts/copies it to the output directory,
 * and clears previous extracted images in the output directory.
 *
 * @param {string} inputFilePath The full path to the input file (e.g., 'D:/path/to/my/input_file/zmt28.pdf').
 * @param {string} outputDirectoryPath The full path to the directory where extracted/copied images should be saved.
 * @param {boolean} [deleteOriginalPdf=true] Optional: Whether to delete the original PDF after successful conversion. Defaults to true.
 */
async function processInputFile(inputFilePath, outputDirectoryPath, deleteOriginalPdf = true) {
    const fileExtension = path.extname(inputFilePath).toLowerCase();
    const fileNameWithoutExt = path.basename(inputFilePath, fileExtension);

    console.log(`Processing input file: ${inputFilePath}`);
    console.log(`Output directory: ${outputDirectoryPath}`);

    try {
        // 1. Clear existing images in the output folder
        console.log(`Clearing existing images in: ${outputDirectoryPath}`);
        await clearDirectory(outputDirectoryPath);

        // Ensure the input file exists
        try {
            await fs.access(inputFilePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Input file not found: ${inputFilePath}`);
            }
            throw error; // Re-throw other access errors
        }

        if (fileExtension === '.pdf') {
            console.log(`Detected PDF file: ${inputFilePath}. Converting to images...`);

            const options = {
                format: 'jpeg',
                out_dir: outputDirectoryPath,
                out_prefix: 'page', // Output images will be named page-1.jpeg, page-2.jpeg, etc.
                page: null, // convert all pages
                poppler_path: POPPLER_BIN_PATH
            };

            try {
                await convert(inputFilePath, options);
                console.log('PDF conversion done.');

                // 3. Delete the original PDF after successful conversion
                if (deleteOriginalPdf) {
                    try {
                        await fs.unlink(inputFilePath);
                        console.log(`Original PDF deleted: ${inputFilePath}`);
                    } catch (deleteError) {
                        console.warn(`Could not delete original PDF file ${inputFilePath}:`, deleteError.message);
                    }
                }

            } catch (conversionError) {
                console.error(`Error during PDF conversion of ${inputFilePath}:`, conversionError);
                throw new Error(`PDF conversion failed for ${inputFilePath}. Details: ${conversionError.message}`);
            }

        } else if (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png') {
            console.log(`Detected image file: ${inputFilePath}. Copying to output folder...`);

            const outputImagePath = path.join(outputDirectoryPath, `${fileNameWithoutExt}${fileExtension}`);
            try {
                await fs.copyFile(inputFilePath, outputImagePath);
                console.log(`Image copied to: ${outputImagePath}`);
            } catch (copyError) {
                console.error(`Error copying image file ${inputFilePath}:`, copyError);
                throw new Error(`Image copy failed for ${inputFilePath}. Details: ${copyError.message}`);
            }

        } else {
            throw new Error(`Unsupported file type: ${fileExtension}. Please provide a PDF, JPG, JPEG, or PNG file.`);
        }

        console.log('File processing completed successfully.');

    } catch (error) {
        console.error('An error occurred during file processing:', error.message);
        // Re-throw the error to allow the caller to handle it
        throw error;
    }
}

export { processInputFile };