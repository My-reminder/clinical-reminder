import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate("/", { replace: true });
      return;
    }
    const sessionId = match[1];

    (async () => {
      try {
        const res = await api.post("/auth/session", { session_id: sessionId });
        setUser(res.data);
        // Clear hash and go to dashboard
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-bg">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-clinic-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-clinic-muted text-sm">Signing you in...</div>
      </div>
    </div>
  );
};

export default AuthCallback;
