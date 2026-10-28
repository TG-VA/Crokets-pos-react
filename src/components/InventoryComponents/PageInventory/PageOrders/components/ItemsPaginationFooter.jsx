import styles from "../PageOrders.module.css";
import PaginationBar from "../../../../PaginationBar/PaginationBar";

export const ITEMS_PAGE_SIZES = [10, 25, 50];

/**
 * Pie de paginacion de las tablas de partidas. `pagination` es el resultado de
 * `usePagination`; `onPageChange` permite interceptar el cambio de pagina.
 */
const ItemsPaginationFooter = ({
  pagination,
  totalItems,
  onPageChange = pagination.handlePageChange,
}) => (
  <div className={styles.paginationFooter}>
    <PaginationBar
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      pageSize={pagination.pageSize}
      pageSizeOptions={ITEMS_PAGE_SIZES}
      onPageChange={onPageChange}
      onPageSizeChange={pagination.handlePageSizeChange}
      totalItems={totalItems}
      startIndex={pagination.startIndex}
      endIndex={pagination.endIndex}
      itemsNoun="productos"
      labelMode="range"
    />
  </div>
);

export default ItemsPaginationFooter;
