import XLSX from 'xlsx';
import mammoth from 'mammoth';
import { ExtractedDocumentData, DocumentType } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export function detectFileType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.xlsx':
    case '.xls':
    case '.csv':
      return 'excel';
    case '.docx':
    case '.doc':
      return 'word';
    case '.pptx':
    case '.ppt':
      return 'powerpoint';
    case '.pdf':
      return 'pdf';
    default:
      return 'other';
  }
}

export async function parseExcelFile(filePath: string): Promise<ExtractedDocumentData> {
  const workbook = XLSX.readFile(filePath);
  const tables: ExtractedDocumentData['tables'] = [];
  const allText: string[] = [];
  const amounts: ExtractedDocumentData['amounts'] = [];
  const dates: string[] = [];
  const issues: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
    
    if (jsonData.length === 0) continue;

    const headers = (jsonData[0] as any[]).map(h => String(h || ''));
    const rows = jsonData.slice(1).map(row => 
      (row as any[]).map(cell => String(cell || ''))
    );

    tables.push({
      name: sheetName,
      headers,
      rows,
    });

    allText.push(`Sheet: ${sheetName}`);
    allText.push(headers.join(' | '));

    for (const row of rows) {
      const rowParts: string[] = [];
      for (let i = 0; i < row.length; i++) {
        const cellVal = row[i];
        if (!cellVal || cellVal === '') continue;
        const header = headers[i] || '';
        if (header) {
          rowParts.push(`${header}: ${cellVal}`);
        } else {
          rowParts.push(cellVal);
        }
      }
      if (rowParts.length > 0) {
        allText.push(rowParts.join(' | '));
      }
    }

    for (const row of jsonData) {
      for (const cell of row as any[]) {
        if (cell === null || cell === undefined) continue;
        
        const cellStr = String(cell);

        const numValue = parseFloat(cellStr.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
          amounts.push({ value: numValue, context: cellStr });
        }

        if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(cellStr) ||
            /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(cellStr)) {
          dates.push(cellStr);
        }

        const issueKeywords = ['error', 'problem', 'issue', 'delay', 'late', 'missing', 'failed', 'reject', 'complaint', 'defect', 'loss', 'damage'];
        if (issueKeywords.some(kw => cellStr.toLowerCase().includes(kw))) {
          issues.push(cellStr);
        }
      }
    }

    const namedJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    for (const row of namedJson) {
      const parts: string[] = [];
      for (const [key, value] of Object.entries(row)) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          parts.push(`${key} ${String(value)}`);
        }
      }
      if (parts.length > 0) {
        allText.push(parts.join(' '));
      }
    }
  }

  const rawText = allText.join('\n').slice(0, 100000);

  console.log(`EXCEL PARSER: ${filePath}`);
  console.log(`EXCEL PARSER: rawText.length = ${rawText.length}`);
  console.log(`EXCEL PARSER: first 500 chars: ${rawText.slice(0, 500)}`);

  return {
    rawText,
    tables,
    keyFindings: extractKeyFindings(allText),
    dates: Array.from(new Set(dates)).slice(0, 50),
    amounts: amounts.slice(0, 100),
    issues: Array.from(new Set(issues)).slice(0, 50),
  };
}

export async function parsePdfFile(filePath: string): Promise<ExtractedDocumentData> {
  const { PDFParse } = await import('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(buffer);
  
  console.log(`PDF PARSER: Reading ${filePath}, buffer size = ${buffer.length} bytes`);
  
  const parser = new PDFParse(uint8);
  await parser.load();
  const result = await parser.getText();
  const numPages = parser.doc?.numPages || 0;
  
  const text = (result?.pages || []).map((p: any) => p.text || '').join('\n\n');
  
  console.log(`PDF PARSER: Extracted text length = ${text.length}`);
  console.log(`PDF PARSER: Pages = ${numPages}`);
  console.log(`PDF PARSER: first 500 chars: ${text.slice(0, 500)}`);

  parser.destroy();

  if (text.trim().length < 50) {
    console.log(`PDF PARSER: WARNING — very little text extracted (${text.trim().length} chars). Possible scanned/image PDF.`);
  }

  const amounts: ExtractedDocumentData['amounts'] = [];
  const dates: string[] = [];
  const issues: string[] = [];

  const currencyMatches = Array.from(text.matchAll(/RM\s?[\d,]+\.?\d*|\$\s?[\d,]+\.?\d*|USD\s?[\d,]+\.?\d*|MYR\s?[\d,]+\.?\d*|[\d,]+\.?\d*\s?(?:ringgit|dollars?)/gi));
  for (const match of currencyMatches) {
    const numStr = match[0].replace(/[^0-9.]/g, '');
    const value = parseFloat(numStr);
    if (!isNaN(value) && value > 0) {
      amounts.push({ value, context: match[0] });
    }
  }

  const dateMatches = Array.from(text.matchAll(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi));
  for (const match of dateMatches) {
    dates.push(match[0]);
  }

  const issueKeywords = ['error', 'problem', 'issue', 'delay', 'late', 'missing', 'failed', 'reject', 'complaint', 'defect', 'loss', 'damage', 'concern', 'risk', 'overdue', 'backlog', 'downtime', 'shortage'];
  const sentences = text.split(/[.!?\n]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && issueKeywords.some(kw => trimmed.toLowerCase().includes(kw))) {
      issues.push(trimmed);
    }
  }

  return {
    rawText: text.slice(0, 100000),
    keyFindings: extractKeyFindings([text]),
    dates: Array.from(new Set(dates)).slice(0, 50),
    amounts: amounts.slice(0, 100),
    issues: Array.from(new Set(issues)).slice(0, 50),
  };
}

export async function parseWordFile(filePath: string): Promise<ExtractedDocumentData> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  console.log(`WORD PARSER: ${filePath}`);
  console.log(`WORD PARSER: rawText.length = ${text.length}`);
  console.log(`WORD PARSER: first 500 chars: ${text.slice(0, 500)}`);

  const amounts: ExtractedDocumentData['amounts'] = [];
  const dates: string[] = [];
  const issues: string[] = [];

  const currencyMatches = Array.from(text.matchAll(/RM\s?[\d,]+\.?\d*|\$\s?[\d,]+\.?\d*|[\d,]+\.?\d*\s?(ringgit|dollars?)/gi));
  for (const match of currencyMatches) {
    const numStr = match[0].replace(/[^0-9.]/g, '');
    const value = parseFloat(numStr);
    if (!isNaN(value) && value > 0) {
      amounts.push({ value, context: match[0] });
    }
  }

  const dateMatches = Array.from(text.matchAll(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi));
  for (const match of dateMatches) {
    dates.push(match[0]);
  }

  const issueKeywords = ['error', 'problem', 'issue', 'delay', 'late', 'missing', 'failed', 'reject', 'complaint', 'defect', 'loss', 'damage', 'concern', 'risk'];
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (issueKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
      issues.push(sentence.trim());
    }
  }

  return {
    rawText: text.slice(0, 100000),
    keyFindings: extractKeyFindings([text]),
    dates: Array.from(new Set(dates)).slice(0, 50),
    amounts: amounts.slice(0, 100),
    issues: Array.from(new Set(issues)).slice(0, 50),
  };
}

export async function parsePowerPointFile(filePath: string): Promise<ExtractedDocumentData> {
  return {
    rawText: 'PowerPoint parsing requires additional setup. File stored for manual review.',
    keyFindings: ['PowerPoint file uploaded - manual extraction may be needed'],
    issues: [],
  };
}

function extractKeyFindings(textParts: string[]): string[] {
  const findings: string[] = [];
  const fullText = textParts.join(' ').toLowerCase();
  
  const patterns = [
    { pattern: /total\s+(?:cost|expense|revenue|sales|loss|profit)[:\s]+[\d,]+/gi, label: 'Financial metric found' },
    { pattern: /(?:increase|decrease|drop|rise|growth)\s+(?:of|by)?\s*\d+%/gi, label: 'Percentage change detected' },
    { pattern: /(?:delayed?|late|overdue|pending)\s+(?:by|for)?\s*\d+\s*(?:days?|weeks?|months?)/gi, label: 'Delay pattern found' },
    { pattern: /(?:error|defect|reject|complaint)\s+rate[:\s]+[\d.]+%?/gi, label: 'Quality issue metric' },
  ];

  for (const { pattern, label } of patterns) {
    const matches = fullText.match(pattern);
    if (matches && matches.length > 0) {
      findings.push(`${label}: ${matches.slice(0, 3).join(', ')}`);
    }
  }

  return findings.slice(0, 10);
}

export async function parseDocument(filePath: string, fileType: DocumentType): Promise<ExtractedDocumentData> {
  console.log(`DOCUMENT PARSER: Parsing ${filePath} as ${fileType}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`DOCUMENT PARSER: File not found: ${filePath}`);
    throw new Error(`File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  console.log(`DOCUMENT PARSER: File size = ${stats.size} bytes`);

  try {
    let result: ExtractedDocumentData;
    
    switch (fileType) {
      case 'excel':
        result = await parseExcelFile(filePath);
        break;
      case 'word':
        result = await parseWordFile(filePath);
        break;
      case 'pdf':
        result = await parsePdfFile(filePath);
        break;
      case 'powerpoint':
        result = await parsePowerPointFile(filePath);
        break;
      default:
        result = {
          rawText: 'File type not supported for automatic parsing.',
          keyFindings: ['Manual review required for this file type'],
        };
    }

    const textLen = result.rawText?.length || 0;
    console.log(`DOCUMENT PARSER: Final rawText length = ${textLen} chars`);
    
    if (textLen < 100) {
      console.warn(`DOCUMENT PARSER: WARNING — extracted text too short (${textLen} chars). Signal extraction will likely fail.`);
      if (fileType === 'pdf') {
        console.warn(`DOCUMENT PARSER: This may be a scanned/image PDF. Text-based PDFs or Excel exports are recommended.`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('DOCUMENT PARSER: Error parsing document:', error);
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
