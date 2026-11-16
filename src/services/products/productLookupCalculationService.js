// Busca un producto por codigo exacto (sin espacios a los lados). Devuelve null si no existe.
export const findProductByCodigo = (products, codigo) => {
  const key = (codigo ?? "").toString().trim();

  if (!key || !Array.isArray(products)) return null;

  return (
    products.find(
      (product) => (product?.codigo ?? "").toString().trim() === key
    ) || null
  );
};
