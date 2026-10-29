import { usePagination } from "../../hooks/usePagination";
import PaginationBar from "../PaginationBar/PaginationBar";

/**
 * Lista paginada en cliente para listas dentro de modales. El tamano de pagina
 * es fijo (sin selector) y los controles solo aparecen cuando hay mas de una
 * pagina, de modo que el modal no gana barras de desplazamiento anidadas.
 * Para volver a la primera pagina al cambiar la busqueda, el padre debe
 * remontar el componente con una `key` que dependa del filtro.
 */
const ModalPaginatedList = ({
  items,
  renderItem,
  pageSize = 5,
  listClassName = "",
  itemsNoun = "productos",
}) => {
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
  } = usePagination({
    totalItems: items.length,
    defaultPageSize: pageSize,
    pageSizeOptions: [pageSize],
  });

  return (
    <>
      <div className={listClassName}>{pageItems(items).map(renderItem)}</div>
      {totalPages > 1 && (
        <PaginationBar
          modal
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={items.length}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsNoun={itemsNoun}
          onPageChange={handlePageChange}
        />
      )}
    </>
  );
};

export default ModalPaginatedList;
