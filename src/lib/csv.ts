export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Handle BOM
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xFEFF) {
    headerLine = headerLine.slice(1);
  }

  const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return { headers, rows };
}

export function generateCSV(headers: string[], rows: Record<string, string>[]): string {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const headerLine = headers.join(',');
  const dataLines = rows.map(row =>
    headers.map(h => row[h] || '').join(',')
  );
  return bom + [headerLine, ...dataLines].join('\n');
}
