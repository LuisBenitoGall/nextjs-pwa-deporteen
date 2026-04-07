import type { TabulatorFull } from 'tabulator-tables';

export async function exportToXls(table: TabulatorFull, filename: string) {
  const { utils, writeFile } = await import('xlsx');
  // Only export visible (filtered) rows, skip internal columns
  const rawData = table.getData('active') as Record<string, unknown>[];
  const cols = table.getColumnDefinitions().filter(
    (c) => c.field && c.field !== '_actions' && c.field !== '_select'
  );
  const data = rawData.map((row) =>
    Object.fromEntries(
      cols.map((c) => [c.title ?? c.field ?? '', row[c.field as string] ?? ''])
    )
  );
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Datos');
  writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPdf(table: TabulatorFull, filename: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const cols = table.getColumnDefinitions().filter(
    (c) => c.field && c.field !== '_actions' && c.field !== '_select'
  );
  const columns = cols.map((c) => ({
    header: String(c.title ?? c.field ?? ''),
    dataKey: String(c.field ?? ''),
  }));

  const rawData = table.getData('active') as Record<string, unknown>[];
  const body = rawData.map((row) =>
    Object.fromEntries(cols.map((c) => [c.field as string, row[c.field as string] ?? '']))
  );

  const doc = new jsPDF({ orientation: 'landscape' });
  autoTable(doc, {
    columns,
    body,
    styles: { fontSize: 8, cellPadding: 3, textColor: [203, 213, 225] },
    headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 7 },
    alternateRowStyles: { fillColor: [15, 23, 42] },
    bodyStyles: { fillColor: [2, 6, 23] },
    tableLineColor: [51, 65, 85],
    tableLineWidth: 0.1,
  });
  doc.save(`${filename}.pdf`);
}
