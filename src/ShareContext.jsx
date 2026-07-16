/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from "react";

const ShareCtx = createContext({
  sections: [],
  item: null,
  type: "",
  register: () => {},
  clear: () => {},
});

export function ShareProvider({ children }) {
  const [sections, setSections] = useState([]);
  const [item, setItem] = useState(null);
  const [type, setType] = useState("");

  const register = useCallback((newItem, newType, newSections) => {
    setItem(newItem);
    setType(newType);
    setSections(newSections);
  }, []);

  const clear = useCallback(() => {
    setSections([]);
    setItem(null);
    setType("");
  }, []);

  return (
    <ShareCtx.Provider value={{ sections, item, type, register, clear }}>
      {children}
    </ShareCtx.Provider>
  );
}

export function useShare() {
  return useContext(ShareCtx);
}
