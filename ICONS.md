### ICONS.md — Catálogo de iconos disponibles
Este proyecto usa **iconos SVG propios**, ubicados en `src/assets/icons/`, en vez de emojis (ver regla estricta en `CODE_STANDARDS.md`, punto 7). Este documento es el catálogo de referencia: antes de escribir un emoji, un símbolo Unicode como icono, o de agregar un icono nuevo de una librería externa, **revisar primero si ya existe uno equivalente aquí**.

#### Cómo usarlos
Los iconos son archivos `.svg` sueltos en `src/assets/icons/`. Se importan como cualquier asset de Vite.

#### Catálogo

##### Acciones generales
| Archivo | Uso sugerido |
| ------ | ------ |
| `plus-solid-full.svg` | Agregar / crear nuevo |
| `pencil-solid-full.svg` | Editar |
| `pen-solid-full.svg` | Editar / firmar |
| `deleteIcon.svg` | Eliminar |
| `xmark-solid-full.svg` | Cerrar / cancelar |
| `circle-check-solid-full.svg` | Confirmar / éxito |
| `verifyIcon.svg` | Verificar / validar |
| `searchIcon.svg` | Buscar |
| `chevron-down-solid-full.svg` | Desplegar / expandir |
| `rotate-left-solid-full.svg` | Deshacer / revertir |
| `eye-solid-full.svg` | Mostrar (ej. contraseña) |
| `eye-slash-solid-full.svg` | Ocultar (ej. contraseña) |
| `changeIcon.svg` | Cambiar / intercambiar |
| `file-import-solid-full.svg` | Importar archivo |
| `print-solid-full.svg` | Imprimir |
| `gear-solid-full.svg` | Configuración / ajustes |

##### Alertas y estado
| Archivo | Uso sugerido |
| ------ | ------ |
| `triangle-exclamation-solid-full.svg` | Advertencia |
| `pendingIcon.svg` | Estado pendiente |
| `lock-solid.svg` / `lock-solid-full.svg` | Bloqueado / restringido |
| `clock-solid-full.svg` | Tiempo / historial |
| `thumbtack-solid-full.svg` | Fijar / destacar |

##### Ventas, dinero y pagos
| Archivo | Uso sugerido |
| ------ | ------ |
| `dollar-sign-solid-full.svg` | Monto / precio genérico |
| `money-bill-wave-solid-full.svg` | Efectivo |
| `money-check-dollar-solid-full.svg` | Cheque / pago con documento |
| `credit-card-solid-full.svg` | Pago con tarjeta |
| `coins-solid-full.svg` | Monedas / cambio |
| `percent-solid-full.svg` | Descuento / porcentaje |
| `payIcon.svg` | Pagar |
| `receipt-solid-full.svg` | Ticket / recibo |
| `file-invoice-dollar-solid-full.svg` | Factura |
| `table-list-solid-full.svg` | Listado / tabla de datos |
| `basket-shopping-solid-full.svg` | Carrito / compra |

##### Inventario y productos
| Archivo | Uso sugerido |
| ------ | ------ |
| `box-solid-full.svg` | Producto individual / caja |
| `boxes-stacked-solid-full.svg` | Inventario / stock |
| `tag-solid-full.svg` | Etiqueta / categoría de producto |
| `gifts-solid-full.svg` | Promociones / kits / recompensas |

##### Usuarios y clientes
| Archivo | Uso sugerido |
| ------ | ------ |
| `user-solid-full.svg` | Usuario / perfil |
| `assignClientIcon.svg` | Asignar cliente |

##### Ubicación y accesos
| Archivo | Uso sugerido |
| ------ | ------ |
| `building-solid-full.svg` | Sucursal / negocio |
| `building-columns-solid-full.svg` | Banco / institución |
| `store-solid-full.svg` | Tienda / sucursal |
| `door-open-solid-full.svg` | Acceso / entrada general |
| `entryIcon.svg` | Entrada |
| `exitIcon.svg` | Salida |

##### Reportes y tiempo
| Archivo | Uso sugerido |
| ------ | ------ |
| `chart-line-solid-full.svg` | Gráfica / reporte de tendencia |
| `calendar-days-solid-full.svg` | Fecha / calendario |

##### Otros (no usar como ícono de UI)
| Archivo | Nota |
| ------ | ------ |
| `icon.ico` | Ícono de la aplicación de escritorio (Electron / instalador). No es parte del catálogo de UI. |

---

#### Si no existe un ícono adecuado
Antes de importar uno nuevo de una librería externa (ej. Font Awesome, Lucide), **preguntar primero**. Si se aprueba agregar uno nuevo:
1. Guardar el `.svg` en `src/assets/icons/` con nombre descriptivo en `kebab-case` (o `camelCase` si sigue el patrón de los `*Icon.svg` existentes, ej. `changeIcon.svg`).
2. Agregarlo a la tabla correspondiente en este documento en el mismo PR.
