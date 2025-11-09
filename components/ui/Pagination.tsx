import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  itemsPerPageOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100]
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(page => {
      if (totalPages <= 7) return true;
      if (page === 1 || page === totalPages) return true;
      if (Math.abs(page - currentPage) <= 1) return true;
      return false;
    });

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Zobrazeno {startItem}-{endItem} z {totalItems}</span>
        <span className="hidden md:inline">|</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="hidden md:inline-block border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {itemsPerPageOptions.map(option => (
            <option key={option} value={option}>{option} / stránka</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pageNumbers.map((page, idx, arr) => {
          if (idx > 0 && page - arr[idx - 1] > 1) {
            return (
              <React.Fragment key={`ellipsis-${page}`}>
                <span className="px-2 text-gray-400">...</span>
                <button onClick={() => onPageChange(page)} className={`px-3 py-1.5 rounded text-sm ${page === currentPage ? 'bg-primary text-white' : 'hover:bg-gray-200'}`}>{page}</button>
              </React.Fragment>
            );
          }
          return (
            <button key={page} onClick={() => onPageChange(page)} className={`px-3 py-1.5 rounded text-sm ${page === currentPage ? 'bg-primary text-white' : 'hover:bg-gray-200'}`}>{page}</button>
          );
        })}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

