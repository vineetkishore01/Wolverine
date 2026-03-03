import { ToolResult } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config.js';

const execAsync = promisify(exec);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

/**
 * Resolve a workspace-relative path to an absolute path.
 */
function resolvePath(p: string): string {
    if (path.isAbsolute(p)) return p;
    const workspace = getConfig().getConfig().workspace.path;
    return path.join(workspace, p);
}

/**
 * Use system textutil to convert documents to plain text.
 * Works for: .docx, .doc, .rtf, .odt, .html
 */
async function readWithTextUtil(absPath: string): Promise<string> {
    try {
        const { stdout } = await execAsync(`textutil -convert txt -stdout "${absPath}"`);
        return stdout;
    } catch (err: any) {
        throw new Error(`textutil failed: ${err.message}`);
    }
}

/**
 * Use python3 to extract text from XLSX files (since they are zip-based XML).
 */
async function readXlsxWithPython(absPath: string): Promise<string> {
    const pyScript = `
import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_xlsx(path):
    try:
        with zipfile.ZipFile(path, 'r') as z:
            # Simple extraction of all strings in sharedStrings.xml
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                with z.open('xl/sharedStrings.xml') as f:
                    tree = ET.parse(f)
                    for t in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                        shared_strings.append(t.text or "")
            
            # Extract cell values from sheets (index-based)
            text_bits = shared_strings
            for name in z.namelist():
                if name.startswith('xl/worksheets/sheet'):
                    with z.open(name) as f:
                        tree = ET.parse(f)
                        for v in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v'):
                            val = v.text
                            if val and val.isdigit() and int(val) < len(shared_strings):
                                # If it's a reference to shared strings
                                pass 
                            elif val:
                                text_bits.append(val)
            return "\\n".join(filter(None, text_bits))
    except Exception as e:
        return str(e)

print(extract_xlsx(sys.argv[1]))
`;
    try {
        const { stdout } = await execAsync(`python3 -c "${pyScript.replace(/"/g, '\\"')}" "${absPath}"`);
        return stdout;
    } catch (err: any) {
        throw new Error(`Python XLSX extraction failed: ${err.message}`);
    }
}

/**
 * Extract text from PDF files using pdf-parse
 */
async function readPdf(absPath: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(absPath);
        const data = await pdfParse(dataBuffer, { max: 1 });
        return data.text || '';
    } catch (err: any) {
        throw new Error(`PDF extraction failed: ${err.message}`);
    }
}

/**
 * Main Document Reader Tool
 */
export async function executeReadDocument(args: { path: string }): Promise<ToolResult> {
    if (!args.path?.trim()) return { success: false, error: 'path is required' };

    const absPath = resolvePath(args.path);
    if (!fs.existsSync(absPath)) {
        return { success: false, error: `File not found: ${absPath}` };
    }

    const ext = path.extname(absPath).toLowerCase();

    try {
        let content = '';

        if (['.docx', '.doc', '.rtf', '.odt', '.html'].includes(ext)) {
            content = await readWithTextUtil(absPath);
        } else if (['.xlsx', '.xls'].includes(ext)) {
            content = await readXlsxWithPython(absPath);
        } else if (ext === '.pdf') {
            content = await readPdf(absPath);
        } else {
            // Fallback to standard read for text files
            content = fs.readFileSync(absPath, 'utf8');
        }

        return {
            success: true,
            stdout: content.slice(0, 10000), // Return a healthy chunk
            data: {
                path: absPath,
                length: content.length,
                truncated: content.length > 10000
            }
        };
    } catch (err: any) {
        return { success: false, error: `Failed to read document: ${err.message}` };
    }
}

export const readDocumentTool = {
    name: 'read_document',
    description: 'Read content from rich documents (DOCX, PDF, XLSX, RTF)',
    execute: executeReadDocument,
    schema: {
        path: 'string (required) - Path to the document file'
    }
};
