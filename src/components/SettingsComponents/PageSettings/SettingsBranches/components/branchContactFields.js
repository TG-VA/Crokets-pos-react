// Campos de contacto del formulario de sucursal. El tipo de sucursal decide cuales se muestran
// (ver branchTypeFormConfig); este arreglo solo describe como se dibuja cada uno.
export const BRANCH_CONTACT_FIELDS = Object.freeze([
  {
    name: "phone",
    label: "Teléfono",
    element: "input",
    inputProps: {
      type: "tel",
      inputMode: "numeric",
      placeholder: "Ej. 9999999999",
      maxLength: 10,
      autoComplete: "off",
    },
  },
  {
    name: "email",
    label: "Correo",
    element: "input",
    inputProps: {
      type: "email",
      placeholder: "contacto@sucursal.com",
      maxLength: 100,
      autoComplete: "off",
    },
  },
  {
    name: "address",
    label: "Dirección comercial",
    element: "textarea",
    fullWidth: true,
    inputProps: {
      placeholder: "Dirección completa de la sucursal",
      rows: 3,
      maxLength: 255,
    },
  },
]);
