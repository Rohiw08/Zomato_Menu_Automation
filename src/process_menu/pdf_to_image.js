import path from 'path';
import { convert } from 'pdf-poppler';
import fs from 'fs/promises';
import { PATHS } from '../paths.js';

const POPPLER_BIN_PATH = PATHS.popplerBin;

async function clearDirectory(directoryPath) {
    try {
        await fs.access(directoryPath); // Check if directory exists
        const files = await fs.readdir(directoryPath);

        if (files.length === 0) {
            console.log(`Directory '${directoryPath}' is already empty.`);
            return;
        }

        console.log(`Clearing ${files.length} files from directory: ${directoryPath}`);
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            await fs.unlink(filePath); // Delete each file
        }
        console.log(`Successfully cleared directory: ${directoryPath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Output directory '${directoryPath}' does not exist. Creating it...`);
            try {
                await fs.mkdir(directoryPath, { recursive: true });
                console.log(`Successfully created directory: ${directoryPath}`);
            } catch (mkdirError) {
                const errMsg = `Failed to create output directory '${directoryPath}': ${mkdirError.message}`;
                console.error(errMsg, mkdirError);
                throw new Error(errMsg); // Re-throw with more context
            }
        } else {
            const errMsg = `Error clearing directory '${directoryPath}': ${error.message}`;
            console.error(errMsg, error);
            throw new Error(errMsg); // Re-throw other errors with more context
        }
    }
}

async function processInputFile(inputFilePath, outputDirectoryPath, deleteOriginalPdf = true) {
    const fileExtension = path.extname(inputFilePath).toLowerCase();
    const fileNameWithoutExt = path.basename(inputFilePath, fileExtension);

    console.log(`\n--- Starting File Processing ---`);
    console.log(`Input File: ${inputFilePath}`);
    console.log(`Output Directory: ${outputDirectoryPath}`);

    try {
        // 1. Ensure output directory is ready (cleared or created)
        console.log(`Preparing output directory: ${outputDirectoryPath}`);
        await clearDirectory(outputDirectoryPath);

        // 2. Ensure the input file exists
        try {
            await fs.access(inputFilePath, fs.constants.R_OK); // Check for readability
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Input file not found: '${inputFilePath}'. Please ensure the file exists and is accessible.`);
            }
            throw new Error(`Access denied or other error for input file '${inputFilePath}': ${error.message}`);
        }

        if (fileExtension === '.pdf') {
            console.log(`Detected PDF file. Converting pages to images...`);

            const options = {
                format: 'jpeg',
                out_dir: outputDirectoryPath,
                out_prefix: 'page', // Output images will be named page-1.jpeg, page-2.jpeg, etc.
                page: null, // convert all pages
                poppler_path: POPPLER_BIN_PATH
            };

            try {
                await convert(inputFilePath, options);
                console.log(`PDF conversion completed for '${inputFilePath}'. Images saved to '${outputDirectoryPath}'.`);

                // 3. Delete the original PDF after successful conversion
                if (deleteOriginalPdf) {
                    try {
                        await fs.unlink(inputFilePath);
                        console.log(`Original PDF deleted: '${inputFilePath}'.`);
                    } catch (deleteError) {
                        console.warn(`Warning: Could not delete original PDF file '${inputFilePath}': ${deleteError.message}`);
                    }
                }
            } catch (conversionError) {
                const errMsg = `PDF conversion failed for '${inputFilePath}'. Ensure Poppler is correctly installed and the file is valid. Details: ${conversionError.message}`;
                console.error(errMsg, conversionError);
                throw new Error(errMsg);
            }

        } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
            console.log(`Detected image file. Copying to output folder...`);

            const outputImagePath = path.join(outputDirectoryPath, `${fileNameWithoutExt}${fileExtension}`);
            try {
                await fs.copyFile(inputFilePath, outputImagePath);
                console.log(`Image copied successfully to: '${outputImagePath}'.`);
            } catch (copyError) {
                const errMsg = `Failed to copy image file '${inputFilePath}' to '${outputDirectoryPath}': ${copyError.message}`;
                console.error(errMsg, copyError);
                throw new Error(errMsg);
            }

        } else {
            throw new Error(`Unsupported file type: '${fileExtension}'. Please provide a PDF, JPG, JPEG, or PNG file.`);
        }

        console.log('--- File processing completed successfully. ---\n');

    } catch (error) {
        console.error(`\n--- An unhandled error occurred during file processing: ${error.message} ---\n`);
        throw error; // Re-throw the error to allow the caller to handle it
    }
}

export { processInputFile };