import * as XLSX from 'xlsx';
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

    for (const row of jsonData) {
      for (const cell of row as any[]) {
        if (cell === null || cell === undefined) continue;
        
        const cellStr = String(cell);
        allText.push(cellStr);

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
  }

  return {
    rawText: allText.join(' ').slice(0, 50000),
    tables,
    keyFindings: extractKeyFindings(allText),
    dates: Array.from(new Set(dates)).slice(0, 50),
    amounts: amounts.slice(0, 100),
    issues: Array.from(new Set(issues)).slice(0, 50),
  };
}

export async function parseWordFile(filePath: string): Promise<ExtractedDocumentData> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

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
    rawText: text.slice(0, 50000),
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
  try {
    switch (fileType) {
      case 'excel':
        return await parseExcelFile(filePath);
      case 'word':
        return await parseWordFile(filePath);
      case 'powerpoint':
        return await parsePowerPointFile(filePath);
      default:
        return {
          rawText: 'File type not supported for automatic parsing.',
          keyFindings: ['Manual review required for this file type'],
        };
    }
  } catch (error) {
    console.error('Error parsing document:', error);
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
