import { renderHook } from '@testing-library/react';
import useSalesTotals from '../useSalesTotals';

describe('useSalesTotals', () => {
  it('calcula totales en un carrito vacío', () => {
    const { result } = renderHook(() => useSalesTotals([]));
    expect(result.current.subtotal).toBe(0);
    expect(result.current.discountTotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('calcula totales para producto normal (sin descuentos)', () => {
    const productos = [
      { precioOriginal: 100, cantidad: 2 } // Subtotal: 200
    ];
    const { result } = renderHook(() => useSalesTotals(productos));
    expect(result.current.subtotal).toBe(200);
    expect(result.current.discountTotal).toBe(0);
    expect(result.current.total).toBe(200);
  });

  it('calcula totales con descuentos manuales y céntimos', () => {
    const productos = [
      { precioOriginal: 150.50, cantidad: 2, descuentoMonto: 10.25 } // Subtotal 301.00
    ];
    const { result } = renderHook(() => useSalesTotals(productos));
    expect(result.current.subtotal).toBe(301);
    expect(result.current.discountTotal).toBe(10.25);
    expect(result.current.total).toBe(290.75); // 301 - 10.25
  });

  it('calcula recompensa gratuita (precio = 0)', () => {
    const productos = [
      { precioOriginal: 200, precio: 0, cantidad: 1, descuentoMonto: 200 } 
    ];
    const { result } = renderHook(() => useSalesTotals(productos));
    expect(result.current.subtotal).toBe(200);
    expect(result.current.discountTotal).toBe(200);
    expect(result.current.total).toBe(0);
  });

  it('evita totales negativos en datos corruptos', () => {
    const productos = [
      { precioOriginal: 50, cantidad: 1, descuentoMonto: 100 } // Error: descuento mayor al precio
    ];
    const { result } = renderHook(() => useSalesTotals(productos));
    expect(result.current.subtotal).toBe(50);
    expect(result.current.discountTotal).toBe(100);
    expect(result.current.total).toBe(0); // Math.max previene -50
  });

  it('hace fallback seguro a precio si falta precioOriginal', () => {
    const productos = [
      { precio: 120, cantidad: 1 } // Ignora precioOriginal undefined
    ];
    const { result } = renderHook(() => useSalesTotals(productos));
    expect(result.current.subtotal).toBe(120);
    expect(result.current.total).toBe(120);
  });
});