import React, { createContext, useContext, useMemo, useState } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts debe usarse dentro de ProductsProvider');
  }
  return context;
};

export const ProductsProvider = ({ children }) => {
  //Productos base ingresados manualmente en el código
  const INITIAL_PRODUCTS = [
    {
      codigo: "1234567890",
      descripcion: "Royal canin urinary so small dog 4kg Royal canin urinary so small dog 4kg Royal canin urinary so small dog 4kg",
      departamento: "ROYAL CANIN",
      costo: 1100,
      precio: 1299,
      existencia: 10,
      minimo: 5,
      maximo: 25,
    },
    {
      codigo: "0987654321",
      descripcion: "Nupec adulto razas pequeñas 8kg",
      departamento: "NUPEC",
      costo: 950,
      precio: 1135,
      existencia: 15,
      minimo: 8,
      maximo: 30,
    },
    {
      codigo: "1111222233",
      descripcion: "Six barrilito",
      departamento: "SR.MASCOTA",
      costo: 100,
      precio: 120,
      existencia: 5,
      minimo: 10,
      maximo: 50,
    },
    {
      codigo: "2222333344",
      descripcion: "Royal canin mini adult 2kg",
      departamento: "ROYAL CANIN",
      costo: 550,
      precio: 665,
      existencia: 8,
      minimo: 6,
      maximo: 20,
    },
    {
      codigo: "3333444455",
      descripcion: "Pro plan puppy small breed 3kg",
      departamento: "PRO PLAN",
      costo: 750,
      precio: 899,
      existencia: 12,
      minimo: 5,
      maximo: 18,
    },
    {
      codigo: "4444555566",
      descripcion: "Hills science diet adult large breed 15kg",
      departamento: "HILLS",
      costo: 1950,
      precio: 2299,
      existencia: 4,
      minimo: 3,
      maximo: 12,
    },
    {
      codigo: "5555666677",
      descripcion: "Whiskas adult chicken 1.5kg",
      departamento: "WHISKAS",
      costo: 155,
      precio: 189,
      existencia: 20,
      minimo: 15,
      maximo: 40,
    },
    {
      codigo: "6666777788",
      descripcion: "Royal canin mature large dog 13kg",
      departamento: "ROYAL CANIN",
      costo: 2400,
      precio: 2899,
      existencia: 3,
      minimo: 2,
      maximo: 8,
    },
    {
      codigo: "7777888899",
      descripcion: "Nupec senior dog 15kg",
      departamento: "NUPEC",
      costo: 1200,
      precio: 1450,
      existencia: 6,
      minimo: 4,
      maximo: 15,
    },
    {
      codigo: "8888999900",
      descripcion: "Sr.mascota premium adult 20kg",
      departamento: "SR.MASCOTA",
      costo: 800,
      precio: 950,
      existencia: 8,
      minimo: 5,
      maximo: 22,
    },
    {
      codigo: "9999000011",
      descripcion: "Pro plan cachorro razas pequeñas 3kg",
      departamento: "PRO PLAN",
      costo: 423,
      precio: 609,
      existencia: 1,
      minimo: 2,
      maximo: 4,
    },
    {
      codigo: "123912931",
      descripcion: "Instinct raw boost cordero 2kg",
      departamento: "INSTINCT",
      costo: 670,
      precio: 730,
      existencia: 1,
      minimo: 1,
      maximo: 2,
    }
  ];

  const [products, setProducts] = useState(() => {
    try {
      const stored = localStorage.getItem('products');
      const loadedProducts = stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
      
      // Filter out duplicates by codigo
      const uniqueProducts = [];
      const seenCodes = new Set();
      
      loadedProducts.forEach(product => {
        const code = (product.codigo || "").toString().trim();
        if (!seenCodes.has(code)) {
          seenCodes.add(code);
          uniqueProducts.push(product);
        }
      });
      
      return uniqueProducts;
    } catch (error) {
      console.error("Error loading products from localStorage", error);
      return INITIAL_PRODUCTS;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('products', JSON.stringify(products));
    } catch (error) {
      console.error("Error saving products to localStorage", error);
    }
  }, [products]);

  const addProduct = (newProduct) => {
    setProducts(prevProducts => [...prevProducts, newProduct]);
  };

  const getProductByCodigo = (codigo) => {
    const key = (codigo ?? "").toString().trim();
    if (!key) return null;
    return products.find((p) => (p?.codigo ?? "").toString().trim() === key) || null;
  };

  const updateProductByCodigo = (codigo, updatedProduct) => {
    const key = (codigo ?? "").toString().trim();
    if (!key) return false;
    let found = false;
    setProducts((prev) =>
      prev.map((p) => {
        const pCode = (p?.codigo ?? "").toString().trim();
        if (pCode !== key) return p;
        found = true;
        return { ...p, ...updatedProduct };
      })
    );
    return found;
  };

  const deleteProductByCodigo = (codigo) => {
    const key = (codigo ?? "").toString().trim();
    if (!key) return false;
    let found = false;
    setProducts((prev) => {
      const exists = prev.some((p) => (p?.codigo ?? "").toString().trim() === key);
      if (exists) found = true;
      return prev.filter((p) => (p?.codigo ?? "").toString().trim() !== key);
    });
    return found;
  };

  const INITIAL_DEPARTMENTS = [
    { id: 1, name: "ROYAL CANIN", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: "NUPEC", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: "SR.MASCOTA", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: "PRO PLAN", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: "HILLS", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: "WHISKAS", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, name: "INSTINCT", status: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  const [departments, setDepartments] = useState(() => {
    try {
      const stored = localStorage.getItem('departments');
      return stored ? JSON.parse(stored) : INITIAL_DEPARTMENTS;
    } catch (error) {
      console.error("Error loading departments from localStorage", error);
      return INITIAL_DEPARTMENTS;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('departments', JSON.stringify(departments));
    } catch (error) {
      console.error("Error saving departments to localStorage", error);
    }
  }, [departments]);

  const addDepartment = (name) => {
    setDepartments(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(d => d.id)) : 0;
      const newDept = {
        id: maxId + 1,
        name,
        status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return [...prev, newDept];
    });
  };

  const updateDepartment = (id, data) => {
    // Si cambia el nombre, actualizar productos asociados
    if (data.name) {
      const dept = departments.find(d => d.id === id);
      if (dept && dept.name !== data.name) {
        const oldName = dept.name.trim().toLowerCase();
        const newName = data.name.trim();
        setProducts(prev => prev.map(p => {
          if ((p.departamento || "").trim().toLowerCase() === oldName) {
            return { ...p, departamento: newName };
          }
          return p;
        }));
      }
    }

    setDepartments(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, ...data, updated_at: new Date().toISOString() };
      }
      return d;
    }));
  };

  const deleteDepartment = (id) => {
    // Desvincular productos del departamento eliminado
    const dept = departments.find(d => d.id === id);
    if (dept) {
      const deptName = dept.name.trim().toLowerCase();
      setProducts(prev => prev.map(p => {
        if ((p.departamento || "").trim().toLowerCase() === deptName) {
          return { ...p, departamento: "" };
        }
        return p;
      }));
    }

    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  const value = {
    products,
    addProduct,
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getProductByCodigo,
    updateProductByCodigo,
    deleteProductByCodigo,
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};
