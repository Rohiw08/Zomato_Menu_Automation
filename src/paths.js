import path from 'path';
import { fileURLToPath } from 'url';

function findUpTo(targetDirName, fromDir) {
    let current = fromDir;
    while (current !== path.parse(current).root) {
        if (path.basename(current) === targetDirName) {
            return current;
        }
        current = path.dirname(current);
    }
    throw new Error(`Project root directory "${targetDirName}" not found traversing up from "${fromDir}". Please ensure the directory structure is correct.`);
}

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

let projectRoot;
try {
    projectRoot = findUpTo('front_end_automation', currentDir);
} catch (error) {
    console.error(`Initialization Error: ${error.message}`);
    projectRoot = path.resolve(currentDir, '../../');
    console.warn(`Falling back to ${projectRoot} as project root. This might lead to unexpected behavior if '${currentDir}' is not nested within 'front_end_automation'.`);
}

const POPPLER_VERSION = '24.08.0';

export const PATHS = {
    projectRoot,
    inputDir: path.join(projectRoot, 'input_file'),
    extractedImagesDir: path.join(projectRoot, 'menu_extracted_images'),
    extractedInfoDir: path.join(projectRoot, 'extracted_info'),
    promptPath: path.join(projectRoot, 'prompt.txt'),
    mergedMenuPath: path.join(projectRoot, 'final_json_output', 'merged_menu.json'),
    popplerBin: path.join(projectRoot, `poppler-${POPPLER_VERSION}`, 'Library', 'bin'),
    // Add more as needed
};

// Optional: Log paths during development for verification
// console.log('Resolved PATHS:', PATHS);