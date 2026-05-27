import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Pagination } from './Pagination.js';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  pageIndex = 0,
  pageSize = 10,
  pageCount = 1,
  totalRecords,
  onPageChange,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="overflow-x-auto rounded-2xl border border-border-surface bg-bg-card backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border-surface bg-bg-inset/40">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-fg-secondary"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-surface">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      <div className="h-4 bg-fg-tertiary/20 rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-fg-secondary">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-bg-inset/20 transition-all duration-150">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-fg-main font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && (
        <Pagination
          currentPage={pageIndex + 1}
          totalPages={pageCount}
          totalRecords={totalRecords}
          onPageChange={(p) => onPageChange(p - 1)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
