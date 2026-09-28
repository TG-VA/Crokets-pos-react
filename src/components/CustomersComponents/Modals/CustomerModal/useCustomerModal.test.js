import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("./services/customerModalService", () => ({
  createCustomer: vi.fn(),
  findCustomerByPhone: vi.fn(),
  resolveCustomerSaveErrorMessage: vi.fn(() => "No se pudo guardar."),
  updateCustomer: vi.fn(),
}));

import {
  createCustomer,
  findCustomerByPhone,
  updateCustomer,
} from "./services/customerModalService";
import { useCustomerModal } from "./useCustomerModal";

const EXISTING_CUSTOMER = {
  id: "c1",
  name: "ANA",
  phone: "5512345678",
  email: "ana@correo.com",
  status: true,
};

const renderCustomerModal = (overrides = {}) => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    customerToEdit: null,
    ...overrides,
  };

  return { ...renderHook(() => useCustomerModal(props)), props };
};

const flush = async () => {
  await act(async () => {});
};

const validForm = {
  name: "BRUNO",
  phone: "5522222222",
  phoneConfirm: "5522222222",
  email: "bruno@correo.com",
  status: true,
};

const fillValidForm = async (result) => {
  for (const [field, value] of Object.entries(validForm)) {
    if (field === "status") continue;
    await act(async () => {
      result.current.handleChange(field, value);
    });
  }
};

describe("useCustomerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCustomerByPhone.mockResolvedValue(null);
    createCustomer.mockResolvedValue("nuevo-id");
    updateCustomer.mockResolvedValue(undefined);
  });

  describe("inicializacion", () => {
    it("deja el formulario vacio al abrir sin cliente", () => {
      const { result } = renderCustomerModal();

      expect(result.current.formData).toEqual({
        name: "",
        phone: "",
        phoneConfirm: "",
        email: "",
        status: true,
      });
      expect(result.current.isEditing).toBe(false);
      expect(result.current.modalTitle).toBe("Nuevo cliente");
    });

    it("carga el cliente a editar con su telefono confirmado", () => {
      const { result } = renderCustomerModal({
        customerToEdit: EXISTING_CUSTOMER,
      });

      expect(result.current.isEditing).toBe(true);
      expect(result.current.modalTitle).toBe("Editar cliente");
      expect(result.current.formData.phone).toBe("5512345678");
      expect(result.current.formData.phoneConfirm).toBe("5512345678");
    });

    it("no toca el formulario mientras el modal esta cerrado", () => {
      const { result } = renderCustomerModal({ isOpen: false });

      expect(result.current.formData.name).toBe("");
    });
  });

  describe("edicion del formulario", () => {
    it("normaliza cada campo al escribir", async () => {
      const { result } = renderCustomerModal();

      await act(async () => result.current.handleChange("name", "  ana  "));
      // El nombre se normaliza en mayusculas pero conserva los espacios
      // mientras se escribe; el recorte final ocurre al guardar.
      expect(result.current.formData.name).toBe(" ANA ");

      await act(async () =>
        result.current.handleChange("phone", "55-12-34-56")
      );
      expect(result.current.formData.phone).toBe("55123456");

      await act(async () => result.current.handleChange("email", " A@B.COM "));
      expect(result.current.formData.email).toBe("a@b.com");
    });

    it("conserva lo escrito entre re-renders del hook", async () => {
      const { result, rerender } = renderCustomerModal();

      await act(async () => result.current.handleChange("name", "ANA"));
      await act(async () => result.current.handleChange("phone", "5512345678"));

      // Un re-render con nuevas propiedades no debe borrar el formulario: las
      // funciones de useAppModal cambian de identidad en cada render.
      await act(async () => {
        rerender();
      });

      expect(result.current.formData.name).toBe("ANA");
      expect(result.current.formData.phone).toBe("5512345678");
    });

    it("revalida al salir de un campo", async () => {
      const { result } = renderCustomerModal();

      await act(async () => result.current.handleChange("name", "AB"));
      expect(result.current.canSave).toBe(false);

      await act(async () => result.current.handleBlur("name"));

      expect(result.current.touchedFields.name).toBe(true);
      expect(result.current.fieldErrors.name).toBe(
        "El nombre debe tener al menos 3 caracteres."
      );
    });

    it("habilita el guardado con un formulario valido", async () => {
      const { result } = renderCustomerModal();

      await fillValidForm(result);

      expect(result.current.canSave).toBe(true);
    });

    it("bloquea el guardado mientras los telefonos no coincidan", async () => {
      const { result } = renderCustomerModal();

      await fillValidForm(result);
      await act(async () =>
        result.current.handleChange("phoneConfirm", "5599999999")
      );

      expect(result.current.canSave).toBe(false);
    });
  });

  describe("guardado", () => {
    it("crea el cliente cuando el telefono no existe", async () => {
      const { result } = renderCustomerModal();
      await fillValidForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "BRUNO", phone: "5522222222" })
      );
      expect(updateCustomer).not.toHaveBeenCalled();
    });

    it("actualiza el cliente a editar", async () => {
      const { result } = renderCustomerModal({
        customerToEdit: EXISTING_CUSTOMER,
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(updateCustomer).toHaveBeenCalledWith({
        customerId: "c1",
        normalizedData: expect.objectContaining({ name: "ANA" }),
      });
      expect(createCustomer).not.toHaveBeenCalled();
    });

    it("enlaza un cliente fiscal existente en vez de crear uno nuevo", async () => {
      findCustomerByPhone.mockResolvedValue({ id: "fiscal-1" });
      const { result } = renderCustomerModal();
      await fillValidForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(updateCustomer).toHaveBeenCalledWith({
        customerId: "fiscal-1",
        normalizedData: expect.objectContaining({ phone: "5522222222" }),
      });
      expect(createCustomer).not.toHaveBeenCalled();
    });

    it("no guarda cuando el formulario tiene errores", async () => {
      const { result } = renderCustomerModal();

      await act(async () => result.current.handleChange("name", "AB"));

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(findCustomerByPhone).not.toHaveBeenCalled();
      expect(createCustomer).not.toHaveBeenCalled();
      expect(result.current.touchedFields).toEqual({
        name: true,
        phone: true,
        phoneConfirm: true,
        email: true,
      });
    });

    it("avisa y no guarda cuando el telefono ya pertenece a otro cliente", async () => {
      findCustomerByPhone.mockResolvedValue({ id: "otro", name: "BRUNO" });
      const { result } = renderCustomerModal({
        customerToEdit: EXISTING_CUSTOMER,
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(updateCustomer).not.toHaveBeenCalled();
      expect(result.current.appModal.message).toBe(
        "Ya existe otro cliente registrado con ese teléfono: BRUNO."
      );
    });

    it("pide confirmacion antes de cambiar el telefono de un cliente con datos fiscales", async () => {
      findCustomerByPhone.mockResolvedValue(null);
      const { result } = renderCustomerModal({
        customerToEdit: { ...EXISTING_CUSTOMER, is_billing_customer: true },
      });

      await act(async () => result.current.handleChange("phone", "5599999999"));
      await act(async () =>
        result.current.handleChange("phoneConfirm", "5599999999")
      );

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(updateCustomer).not.toHaveBeenCalled();
      expect(result.current.appModal.type).toBe("warning");
      expect(result.current.appModal.title).toBe(
        "Confirmar cambio de teléfono"
      );
      expect(result.current.appModal.message).toContain("datos fiscales");

      await act(async () => {
        await result.current.appModal.onConfirm();
      });
      await flush();

      expect(updateCustomer).toHaveBeenCalledWith({
        customerId: "c1",
        normalizedData: expect.objectContaining({ phone: "5599999999" }),
      });
    });

    it("avisa al dar de alta un cliente de puntos duplicado", async () => {
      findCustomerByPhone.mockResolvedValue({
        id: "p1",
        name: "OTRO",
        is_points_customer: true,
      });
      const { result } = renderCustomerModal();
      await fillValidForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(createCustomer).not.toHaveBeenCalled();
      expect(result.current.appModal.message).toBe(
        "Ya existe un cliente de puntos registrado con ese teléfono: OTRO."
      );
    });

    it("ignora el fallo del refresco del listado tras guardar", async () => {
      const onSaved = vi.fn().mockRejectedValue(new Error("listado"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { result, props } = renderCustomerModal({ onSaved });
      await fillValidForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error actualizando listado de clientes:",
        expect.any(Error)
      );
      expect(result.current.appModal.type).toBe("success");
      expect(result.current.appModal.title).toBe("Cliente creado");
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  describe("cierre", () => {
    it("no cierra el modal mientras haya un dialogo abierto", async () => {
      const { result, props } = renderCustomerModal();
      await fillValidForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.appModal.isOpen).toBe(true);

      await act(async () => {
        result.current.handleRequestClose();
      });

      expect(props.onClose).not.toHaveBeenCalled();
    });

    it("cierra el modal al confirmar el dialogo de exito", async () => {
      const { result, props } = renderCustomerModal();
      await fillValidForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      await act(async () => {
        result.current.appModal.onConfirm();
      });

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onSaved).toHaveBeenCalled();
    });

    it("cierra el modal al pedirlo cuando no hay dialogo abierto", async () => {
      const { result, props } = renderCustomerModal();

      await act(async () => {
        result.current.handleRequestClose();
      });

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
