import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { translations } from "../lib/i18n";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(() => localStorage.getItem("clinic_lang") || "en");

  const t = useCallback((key) => (translations[lang] && translations[lang][key]) || key, [lang]);

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem("clinic_lang", l);
  };

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip /auth/me if returning from OAuth (session_id present)
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed:", err);
    }
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AppContext.Provider value={{ user, setUser, loading, lang, setLang: changeLang, t, checkAuth, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};
