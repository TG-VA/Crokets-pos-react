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
  // Productos iniciales de muestra
  const [products, setProducts] = useState([
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
    },
    {
      codigo: "12282820392",
      descripcion: "Instinct raw boost salmon 2kg",
      departamento: "INSTINCT",
      costo: 670,
      precio: 730,
      existencia: 1,
      minimo: 1,
      maximo: 2,
    },
    {
      codigo: "88123981212",
      descripcion: "Instinct raw boost salmon 2kg",
      departamento: "INSTINCT",
      costo: 670,
      precio: 730,
      existencia: 1,
      minimo: 1,
      maximo: 2,
    }
  ]);

  const addProduct = (newProduct) => {
    setProducts(prevProducts => [...prevProducts, newProduct]);
  };

  const departments = useMemo(
    () => ["ROYAL CANIN", "NUPEC", "SR.MASCOTA", "PRO PLAN", "HILLS", "WHISKAS", "INSTINCT"],
    []
  );

  const value = {
    products,
    addProduct,
    departments,
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};
