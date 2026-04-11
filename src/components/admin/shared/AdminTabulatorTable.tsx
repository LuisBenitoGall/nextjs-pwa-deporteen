'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Options, ColumnDefinition, TabulatorFull } from 'tabulator-tables';
import './tabulator-theme.css';
import { exportToXls, exportToPdf } from './tableExports';

export interface AdminTabulatorTableProps<
  TRow extends object = Record<string, unknown>,
> {
  data: TRow[];
  columns: ColumnDefinition[];
  /** Enable row checkboxes for bulk selection */
  selectable?: boolean;
  /** Called with selected rows when bulk action button is clicked */
  onBulkAction?: (rows: TRow[]) => void;
  bulkActionLabel?: string;
  /** Base filename for XLS/PDF exports (no extension) */
  exportFileName?: string;
  /** Slot rendered left of the export buttons (e.g. status filter) */
  toolbarLeft?: React.ReactNode;
  /** Slot rendered right of the table counter (e.g. "+ Nuevo" button) */
  toolbarRight?: React.ReactNode;
  /** Merge extra Tabulator options */
  tableOptions?: Partial<Options>;
  /** Forward the Tabulator instance to the parent if needed */
  tabulatorRef?: React.MutableRefObject<TabulatorFull | null>;
}

const ICON_XLS = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
const ICON_PDF = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v-4"/><path d="M12 15v-6"/><path d="M15 15v-2"/></svg>`;

export default function AdminTabulatorTable<
  TRow extends object = Record<string, unknown>,
>({
  data,
  columns,
  selectable = false,
  onBulkAction,
  bulkActionLabel = 'Acción en lote',
  exportFileName = 'export',
  toolbarLeft,
  toolbarRight,
  tableOptions,
  tabulatorRef,
}: AdminTabulatorTableProps<TRow>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tableInstanceRef = useRef<TabulatorFull | null>(null);
  const dataRef = useRef(data);
  const [selectedRows, setSelectedRows] = useState<TRow[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Keep dataRef current without triggering effects
  dataRef.current = data;

  // ── Mount / destroy ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    import('tabulator-tables').then(({ TabulatorFull }) => {
      if (cancelled || !containerRef.current) return;

      const selectCol: ColumnDefinition = {
        title: '',
        formatter: 'rowSelection',
        titleFormatter: 'rowSelection',
        field: '_select',
        width: 40,
        minWidth: 40,
        hozAlign: 'center',
        vertAlign: 'middle',
        headerSort: false,
        resizable: false,
      };

      const allColumns = selectable ? [selectCol, ...columns] : columns;

      const options: Options = {
        data: dataRef.current,
        columns: allColumns,
        layout: 'fitColumns',
        pagination: true,
        paginationMode: 'local',
        paginationSize: 25,
        paginationSizeSelector: [10, 25, 50, 100],
        paginationCounter: 'rows',
        selectableRows: selectable ? true : false,
        selectableRowsRangeMode: 'click',
        placeholder: 'Sin resultados',
        locale: 'es',
        langs: {
          es: {
            pagination: {
              page_size: 'Filas por página',
              page_title: 'Mostrar página',
              first: '«',
              first_title: 'Primera',
              last: '»',
              last_title: 'Última',
              prev: '‹',
              prev_title: 'Anterior',
              next: '›',
              next_title: 'Siguiente',
              all: 'Todo',
              counter: {
                showing: 'Mostrando',
                of: 'de',
                rows: 'filas',
                pages: 'páginas',
              },
            },
          },
        },
        columnDefaults: {
          headerSort: true,
          resizable: false,
        },
        ...tableOptions,
      };

      const table = new TabulatorFull(containerRef.current!, options);

      table.on('tableBuilt', () => {
        if (!cancelled) setIsReady(true);
      });

      if (selectable) {
        table.on('rowSelectionChanged', (data: unknown[]) => {
          if (!cancelled) setSelectedRows(data as TRow[]);
        });
      }

      tableInstanceRef.current = table;
      if (tabulatorRef) tabulatorRef.current = table;
    });

    return () => {
      cancelled = true;
      tableInstanceRef.current?.destroy();
      tableInstanceRef.current = null;
      if (tabulatorRef) tabulatorRef.current = null;
      setIsReady(false);
      setSelectedRows([]);
    };
    // Mount once: Tabulator uses initial columns/selectable/tableOptions; data syncs in a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync data without remounting ────────────────────────────
  useEffect(() => {
    if (!tableInstanceRef.current || !isReady) return;
    tableInstanceRef.current.replaceData(data).catch(() => {});
  }, [data, isReady]);

  // ── Export handlers ──────────────────────────────────────────
  const handleExportXls = useCallback(async () => {
    if (!tableInstanceRef.current) return;
    await exportToXls(tableInstanceRef.current, exportFileName);
  }, [exportFileName]);

  const handleExportPdf = useCallback(async () => {
    if (!tableInstanceRef.current) return;
    await exportToPdf(tableInstanceRef.current, exportFileName);
  }, [exportFileName]);

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {toolbarLeft}
          {selectedRows.length > 0 && onBulkAction && (
            <button
              onClick={() => onBulkAction(selectedRows)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-700/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              {bulkActionLabel} ({selectedRows.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {toolbarRight}
          <button
            onClick={handleExportXls}
            title="Exportar a Excel"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-colors"
            dangerouslySetInnerHTML={{
              __html: `${ICON_XLS}<span>XLS</span>`,
            }}
          />
          <button
            onClick={handleExportPdf}
            title="Exportar a PDF"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-colors"
            dangerouslySetInnerHTML={{
              __html: `${ICON_PDF}<span>PDF</span>`,
            }}
          />
        </div>
      </div>

      {/* ── Tabulator mount (scoped theme via .admin-tabulator-root in tabulator-theme.css) ── */}
      <div className="admin-tabulator-root w-full min-w-0">
        <div ref={containerRef} />
      </div>
    </div>
  );
}
