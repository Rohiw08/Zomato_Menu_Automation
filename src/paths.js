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
  throw new Error(`Directory "${targetDirName}" not found.`);
}

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);
const projectRoot = findUpTo('front_end_automation', currentDir);

export const PATHS = {
  projectRoot,
  inputDir: path.join(projectRoot, 'input_file'),
  extractedImagesDir: path.join(projectRoot, 'menu_extracted_images'),
  extractedInfoDir: path.join(projectRoot, 'extracted_info'),
  promptPath: path.join(projectRoot, 'prompt.txt'),
  mergedMenuPath: path.join(projectRoot, 'merged_menu.json'),
  popplerBin: path.join(projectRoot, 'poppler-24.08.0', 'Library', 'bin'),
  // Add more as needed
};

console.log(PATHS);

