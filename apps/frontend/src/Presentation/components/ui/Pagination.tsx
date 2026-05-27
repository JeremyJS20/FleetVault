import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ currentPage, totalPages, totalRecords, onPageChange, isLoading }: PaginationProps) {
  const { t } = useTranslation();
  const stablePagesRef = useRef(totalPages);
  if (totalPages > 1 || (!isLoading && totalPages === 1)) {
    stablePagesRef.current = totalPages;
  }
  const displayPages = stablePagesRef.current;
  if (displayPages <= 1) return null;

  const getPages = (): (number | 'ellipsis')[] => {
    if (displayPages <= 7) {
      return Array.from({ length: displayPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (currentPage > 3) pages.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(displayPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < displayPages - 2) pages.push('ellipsis');
    pages.push(displayPages);
    return pages;
  };

  const pages = getPages();
  const btnBase = 'h-8 w-8 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all';
  const btnActive = 'bg-accent-primary text-white';
  const btnInactive = 'bg-bg-inset border border-border-surface/40 text-fg-secondary hover:bg-bg-surface/40';
  const btnDisabled = 'opacity-30 cursor-not-allowed';

  return (
    <div className="flex items-center justify-between px-2">
      <span className="text-xs font-semibold text-fg-secondary whitespace-nowrap">
        {t('common.pageOf', { current: currentPage, total: displayPages })}
        {totalRecords !== undefined && (
          <span className="ml-1 text-fg-tertiary">({totalRecords} {t('common.records')})</span>
        )}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${btnBase} ${currentPage === 1 || isLoading ? btnDisabled : btnInactive}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="h-8 w-6 flex items-center justify-center text-xs text-fg-tertiary select-none">
              ...
            </span>
          ) : (
            <button
              key={p}
              disabled={isLoading}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === currentPage ? btnActive : btnInactive} ${isLoading ? btnDisabled : ''}`}
            >
              {p}
            </button>
          )
        )}

        <button
          disabled={currentPage === displayPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${btnBase} ${currentPage === displayPages || isLoading ? btnDisabled : btnInactive}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
