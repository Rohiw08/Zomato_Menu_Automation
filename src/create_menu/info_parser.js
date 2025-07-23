async function extractTextFromSSE(sseOutput) {
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

        // Handle different SSE response formats
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

        // Handle array patches
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

        // Handle direct patches
        if (
            data.p === '/message/content/parts/0' &&
            data.o === 'append' &&
            typeof data.v === 'string'
        ) {
            content += data.v;
        }
    }

    return content.trim();
}

function cleanJsonString(jsonStr) {
    return jsonStr
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([\x00-\x1F\x7F])/g, '') // Remove control characters
        .trim();
}

function parseJson(content) {
    // Try direct parsing first
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
        }
    } catch (err) {
        // Continue to pattern matching
    }

    // Try pattern matching for JSON blocks
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
            
            // Try parsing as-is
            try {
                const parsed = JSON.parse(jsonStr);
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed;
                }
            } catch (err) {
                // Try with cleaning
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

    return null; // No valid JSON found
}

export {extractTextFromSSE, parseJson};