import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table column types vary
  columns: ColumnDef<TData, unknown>[] | ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  toolbar?: React.ReactNode
  emptyMessage?: string
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  toolbar,
  emptyMessage = 'Nenhum resultado encontrado.',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState(searchValue ?? '')

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table API
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: (updater) => {
      const value = typeof updater === 'function' ? updater(globalFilter) : updater
      setGlobalFilter(value)
      onSearchChange?.(value)
    },
    state: {
      sorting,
      columnFilters,
      globalFilter: searchValue !== undefined ? searchValue : globalFilter,
    },
    initialState: { pagination: { pageSize: 10 } },
  })

  const currentFilter = searchValue !== undefined ? searchValue : globalFilter

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {(onSearchChange !== undefined || toolbar) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {onSearchChange !== undefined && (
            <input
              placeholder={searchPlaceholder}
              value={currentFilter}
              onChange={(e) => {
                const v = e.target.value
                setGlobalFilter(v)
                onSearchChange?.(v)
              }}
              className="h-9 w-full max-w-xs rounded-md border border-input bg-surface px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          {toolbar && (
            <div className="flex items-center gap-2 ml-auto">{toolbar}</div>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 border-b border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'h-10 px-4 text-left font-medium text-muted-foreground',
                      header.column.getCanSort() &&
                        'cursor-pointer select-none hover:text-foreground'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className="text-muted-foreground/40">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{table.getFilteredRowModel().rows.length} resultado(s)</span>
        <div className="flex items-center gap-1">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) =>
              table.setPageSize(Number(e.target.value))
            }
            className="h-8 rounded border border-input px-2 text-xs bg-surface"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs">
            {table.getState().pagination.pageIndex + 1} /{' '}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
