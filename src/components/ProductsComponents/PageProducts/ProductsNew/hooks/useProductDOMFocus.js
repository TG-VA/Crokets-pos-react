import { useEffect, useRef, useState } from "react";

export const useProductDOMFocus = ({ isFormValid, errors, usesInventory, form, appModalIsOpen, onSubmit }) => {
  const bodyRef = useRef(null);
  const [submitArmed, setSubmitArmed] = useState(false);

  const getFocusableBodyElements = () => {
    if (!bodyRef.current) return [];
    const nodes = Array.from(bodyRef.current.querySelectorAll("input, select, textarea, button"));
    return nodes.filter((el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.tagName === "INPUT" && el.type === "hidden") return false;
      if (el.tabIndex === -1) return false;
      if (el.tagName === "INPUT" && el.readOnly) return false;
      return true;
    });
  };

  const focusFirstInvalidField = () => {
    const order = [
      "codigo", "descripcion", "costo", "precio", "tax",
      ...(usesInventory ? ["existencia", "minimo", "maximo"] : []),
      ...(form.commission_enabled ? ["commission_value"] : []),
    ];

    for (const field of order) {
      if (errors[field]) {
        const selectorMap = {
          codigo: 'input[name="codigo"]', descripcion: 'input[name="descripcion"]',
          costo: 'input[name="costo"]', precio: 'input[name="precio"]',
          tax: 'input[name="tax"]', existencia: 'input[name="existencia"]',
          minimo: 'input[name="minimo"]', maximo: 'input[name="maximo"]',
          commission_value: 'input[name="commission_value"]',
        };
        const target = bodyRef.current?.querySelector(selectorMap[field]);
        if (target) {
          target.focus();
          if (typeof target.select === "function") target.select();
        }
        break;
      }
    }
  };

  const preventNumberScrollChange = (e) => e.target.blur();
  
  const preventNumberArrows = (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
  };

  useEffect(() => {
    if (!submitArmed || appModalIsOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      setSubmitArmed(false);
      onSubmit();
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [submitArmed, isFormValid, errors, form, appModalIsOpen, onSubmit]);

  const handleContentKeyDown = (e) => {
    if (appModalIsOpen) return;
    if (e.key !== "Enter") return;
    e.preventDefault();

    const focusables = getFocusableBodyElements();
    const active = document.activeElement;
    const index = focusables.indexOf(active);

    if (index === -1) return;

    if (index < focusables.length - 1) {
      setSubmitArmed(false);
      const next = focusables[index + 1];
      next.focus();
      if (typeof next.select === "function") next.select();
      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);
      if (active && typeof active.blur === "function") active.blur();
      return;
    }

    setSubmitArmed(false);
    onSubmit();
  };

  return {
    bodyRef, submitArmed, setSubmitArmed, focusFirstInvalidField,
    preventNumberScrollChange, preventNumberArrows, handleContentKeyDown
  };
};