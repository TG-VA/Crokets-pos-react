// src/contexts/BranchContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branch, setBranch] = useState(null);

  const value = useMemo(() => ({ branch, setBranch }), [branch]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch debe usarse dentro de <BranchProvider />");
  return ctx;
}