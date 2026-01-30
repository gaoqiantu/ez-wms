import * as XLSX from 'xlsx';

interface ExportOptions {
  filename: string;
  sheetName: string;
  headers: { key: string; label: string }[];
  data: Record<string, unknown>[];
}

export function exportToExcel({ filename, sheetName, headers, data }: ExportOptions) {
  // Create worksheet data with headers
  const wsData = [
    headers.map(h => h.label),
    ...data.map(row => headers.map(h => row[h.key] ?? ''))
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 15 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
