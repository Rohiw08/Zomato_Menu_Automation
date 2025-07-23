import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '../paths.js'; // make sure the path is correct

async function extractJsonFromSSE(sseOutput) {
    let content = '';
    const lines = sseOutput.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || !line.startsWith('data:')) continue;

        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]' || dataStr === 'v1') continue;

        let data;
        try {
            data = JSON.parse(dataStr);
        } catch (e) {
            continue;
        }

        if (data.v !== undefined) {
            if (typeof data.v === 'string') {
                content += data.v;
            } else if (data.v?.message?.content?.parts?.[0] !== undefined) {
                const initialContent = data.v.message.content.parts[0];
                if (typeof initialContent === 'string') {
                    content = initialContent;
                }
            }
        }

        if (Array.isArray(data.v)) {
            for (const patch of data.v) {
                if (
                    patch.o === 'append' &&
                    patch.p === '/message/content/parts/0' &&
                    typeof patch.v === 'string'
                ) {
                    content += patch.v;
                }
            }
        }

        if (
            data.p === '/message/content/parts/0' &&
            data.o === 'append' &&
            typeof data.v === 'string'
        ) {
            content += data.v;
        }

        if (
            data.type &&
            ['server_ste_metadata', 'message_marker', 'message_stream_complete', 'conversation_detail_metadata'].includes(data.type)
        ) {
            continue;
        }
    }

    content = content.trim();

    const jsonPatterns = [
        /```json\s*([\s\S]*?)\s*```/i,
        /```\s*(\[[\s\S]*?\])\s*```/i,
        /```\s*(\{[\s\S]*?\})\s*```/i,
        /(\[[\s\S]*\])/,
        /(\{[\s\S]*\})/
    ];

    for (const pattern of jsonPatterns) {
        const match = content.match(pattern);
        if (match) {
            const jsonStr = match[1].trim();
            try {
                const parsed = JSON.parse(jsonStr);
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed;
                }
            } catch (err) {
                const cleaned = cleanJsonString(jsonStr);
                try {
                    const parsed = JSON.parse(cleaned);
                    if (typeof parsed === 'object' && parsed !== null) {
                        return parsed;
                    }
                } catch {
                    continue;
                }
            }
        }
    }

    return null;
}

function cleanJsonString(jsonStr) {
    return jsonStr
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/([^\\])"/g, '$1\\"')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim();
}

async function main() {
    const infoFiles = await fs.readdir(PATHS.extractedInfoDir);
    const txtFiles = infoFiles.filter(f => f.endsWith('.txt'));

    for (const file of txtFiles) {
        const filePath = path.join(PATHS.extractedInfoDir, file);
        try {
            const sseOutput = await fs.readFile(filePath, 'utf-8');
            const json = await extractJsonFromSSE(sseOutput);

            if (json) {
                await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
                console.log(`✅ Processed and saved JSON for: ${file}`);
            } else {
                console.warn(`⚠️ No valid JSON extracted from: ${file}`);
            }
        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err.message);
        }
    }
}

main();

export { extractJsonFromSSE };
