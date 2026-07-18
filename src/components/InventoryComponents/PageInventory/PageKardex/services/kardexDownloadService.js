const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const downloadKardexWorkbook =
  async ({
    workbook,
    filename,
  }) => {
    if (!workbook) {
      throw new Error(
        "No se recibió el archivo de Excel para descargar."
      );
    }

    if (!filename) {
      throw new Error(
        "No se recibió el nombre del archivo."
      );
    }

    const output =
      await workbook.xlsx.writeBuffer();

    const blob =
      new Blob(
        [output],
        {
          type:
            EXCEL_MIME_TYPE,
        }
      );

    const objectUrl =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      objectUrl;

    anchor.download =
      filename;

    anchor.style.display =
      "none";

    document.body.appendChild(
      anchor
    );

    try {
      anchor.click();
    } finally {
      anchor.remove();

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );
    }
  };