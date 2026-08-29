import ExcelJS from 'exceljs';

export const exportFullReportToExcel = async (reportData, branchName = 'Todas', dateRange = {}) => {
  try {
    if (!reportData || (!reportData.topProducts && !reportData.byDepartment && !reportData.deadStock)) {
      alert("No hay datos disponibles para exportar. Por favor, consulta o genera el reporte primero.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Crokets POS';
    workbook.created = new Date();

    const createSheet = (sheetName, columns, dataArray) => {
      const ws = workbook.addWorksheet(sheetName);
      ws.columns = columns;

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      (dataArray || []).forEach((item) => {
        ws.addRow(item);
      });

      ws.columns.forEach((col) => {
        if (col.header === 'Ingreso ($)') {
          col.numFmt = '"$"#,##0.00';
          col.alignment = { horizontal: 'right' };
        } else if (col.header === 'Unidades' || (col.header && col.header.includes('Stock'))) {
          col.numFmt = '#,##0';
          col.alignment = { horizontal: 'right' };
        } else {
          col.alignment = { horizontal: 'left' };
        }
      });
    };

    createSheet('Por Departamento', [
      { header: 'Departamento', key: 'name', width: 25 },
      { header: 'Unidades', key: 'quantity', width: 15 },
      { header: 'Ingreso ($)', key: 'revenue', width: 20 }
    ], reportData.byDepartment || []);

    const productCols = [
      { header: 'Código', key: 'barcode', width: 18 },
      { header: 'Producto', key: 'name', width: 45 },
      { header: 'Unidades', key: 'quantity', width: 15 },
      { header: 'Ingreso ($)', key: 'revenue', width: 20 },
      { header: 'Stock Actual', key: 'stock', width: 15 }
    ];

    createSheet('Top Ventas', productCols, reportData.topProducts || []);
    createSheet('Menor Rotación', productCols, reportData.bottomProducts || []);

    createSheet('Inventario Muerto', [
      { header: 'Código', key: 'barcode', width: 18 },
      { header: 'Producto', key: 'name', width: 45 },
      { header: 'Departamento', key: 'departmentName', width: 25 },
      { header: 'Stock Sin Movimiento', key: 'stock', width: 25 }
    ], reportData.deadStock || []);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const safeBranchName = String(branchName || 'Todas').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const start = dateRange.startDate || '';
    const end = dateRange.endDate || '';
    const dateStr = (start && end) ? `${start}_al_${end}` : 'General';

    link.download = `Reporte_Productos_${safeBranchName}_${dateStr}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    alert("Ocurrió un error al generar el archivo de Excel: " + error.message);
  }
};

export const exportInventoryReportToExcel = async (reportData, branchName = 'Todas') => {
  try {
    if (!reportData || (!reportData.items?.length && !reportData.byDepartment?.length)) {
      alert("No hay datos de inventario disponibles para exportar.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Crokets POS';
    workbook.created = new Date();

    const createStyledSheet = (sheetName, columns, dataArray) => {
      const ws = workbook.addWorksheet(sheetName);
      ws.columns = columns;

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1092B1' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      (dataArray || []).forEach((item) => {
        ws.addRow(item);
      });

      ws.columns.forEach((col) => {
        const header = String(col.header || '');
        if (header.includes('($)') || header.includes('Costo') || header.includes('Precio') || header.includes('Valor') || header.includes('Inversión')) {
          col.numFmt = '"$"#,##0.00';
          col.alignment = { horizontal: 'right' };
        } else if (header.includes('Stock') || header.includes('Piezas') || header.includes('Cantidad') || header.includes('No.')) {
          col.numFmt = '#,##0';
          col.alignment = { horizontal: 'right' };
        } else if (header.includes('%')) {
          col.numFmt = '0.00"%"';
          col.alignment = { horizontal: 'right' };
        } else {
          col.alignment = { horizontal: 'left' };
        }
      });
    };

    createStyledSheet('Existencias y Valorización', [
      { header: 'Código', key: 'barcode', width: 18 },
      { header: 'Producto', key: 'name', width: 42 },
      { header: 'Departamento', key: 'departmentName', width: 22 },
      { header: 'Stock Actual', key: 'stock', width: 15 },
      { header: 'Stock Mínimo', key: 'min_stock', width: 15 },
      { header: 'Stock Máximo', key: 'max_stock', width: 15 },
      { header: 'Costo Unitario ($)', key: 'cost_price', width: 18 },
      { header: 'Precio Venta ($)', key: 'sale_price', width: 18 },
      { header: 'Valor al Costo ($)', key: 'total_cost', width: 20 },
      { header: 'Valor a la Venta ($)', key: 'total_sale', width: 20 },
      { header: 'Estado', key: 'statusLabel', width: 16 }
    ], reportData.items || []);

    createStyledSheet('Sugerencias de Reorden', [
      { header: 'Código', key: 'barcode', width: 18 },
      { header: 'Producto', key: 'name', width: 42 },
      { header: 'Departamento', key: 'departmentName', width: 22 },
      { header: 'Stock Actual', key: 'stock', width: 15 },
      { header: 'Stock Mínimo', key: 'min_stock', width: 15 },
      { header: 'Stock Máximo', key: 'max_stock', width: 15 },
      { header: 'Cantidad Sugerida', key: 'suggestedQty', width: 18 },
      { header: 'Costo Unitario ($)', key: 'cost_price', width: 18 },
      { header: 'Inversión Sugerida ($)', key: 'estimatedInvestment', width: 22 }
    ], reportData.reorderSuggestions || []);

    createStyledSheet('Por Departamento', [
      { header: 'Departamento', key: 'name', width: 26 },
      { header: 'No. Productos', key: 'productCount', width: 16 },
      { header: 'Total Piezas', key: 'totalUnits', width: 16 },
      { header: 'Valor al Costo ($)', key: 'totalCost', width: 20 },
      { header: 'Valor a la Venta ($)', key: 'totalSale', width: 20 },
      { header: '% del Inventario', key: 'percentage', width: 18 }
    ], reportData.byDepartment || []);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const safeBranchName = String(branchName || 'Todas').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    link.download = `Reporte_Inventario_${safeBranchName}_${dateStr}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error al exportar inventario a Excel:", error);
    alert("Ocurrió un error al generar el archivo de Excel: " + error.message);
  }
};