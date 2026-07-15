import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) => {
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  const handleItemsPerPageChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    onItemsPerPageChange(newSize);
    // Reset to page 1 when changing page size
    if (currentPage !== 1) onPageChange(1);
  };

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null; // No pagination needed
  }

  // Generate page numbers to display (max 5)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`pagination-controls ${className}`}>
      <div className="pagination-info">
        <span>
          {totalItems} élément(s) — Page {currentPage} sur {totalPages}
        </span>
        <div className="pagination-size-selector">
          <label htmlFor="itemsPerPage">Lignes par page :</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pagination-buttons">
        <button
          className="page-btn"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          aria-label="Première page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className="page-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ))}

        <button
          className="page-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="page-btn"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Dernière page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;