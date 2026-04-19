import React from "react";
import { useApp } from "../context/AppContext";
import { Pill, ShieldCheck, Languages, BellRing } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const Login = () => {
  const { t, lang, setLang } = useApp();

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-clinic-bg flex flex-col lg:flex-row">
      {/* Left - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/4e7cf202-bb93-4ac8-9cbf-3975ed74231a/images/383fc0c3f017d0ce6f36d2310795d01d8218de97d00898d1794a2d2abadc0a3d.png"
          alt="Clinic"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-clinic-primary/70 via-clinic-primary/30 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="text-xs uppercase tracking-[0.3em] opacity-90 mb-4">Modern care · Everyday reminders</div>
          <h1 className="font-heading text-5xl font-bold leading-tight mb-4">
            Never miss a dose.<br />
            <span className="text-clinic-secondary">Deliver care that sticks.</span>
          </h1>
          <p className="text-base opacity-90 max-w-md leading-relaxed">
            Automate medicine reminders via WhatsApp for every patient in your clinic — in English or Hindi.
          </p>
          <div className="mt-10 flex items-center gap-6 text-sm opacity-90">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Secure & private</div>
            <div className="flex items-center gap-2"><BellRing className="w-4 h-4" /> WhatsApp delivery</div>
            <div className="flex items-center gap-2"><Languages className="w-4 h-4" /> EN / हिं</div>
          </div>
        </div>
      </div>

      {/* Right - Auth card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Language picker */}
          <div className="flex justify-end mb-10">
            <div className="inline-flex rounded-full border border-clinic-border bg-clinic-surface p-1 text-xs">
              <button
                data-testid="login-lang-en"
                onClick={() => setLang("en")}
                className={`px-4 py-1.5 rounded-full transition ${lang === "en" ? "bg-clinic-primary text-white" : "text-clinic-muted"}`}
              >
                EN
              </button>
              <button
                data-testid="login-lang-hi"
                onClick={() => setLang("hi")}
                className={`px-4 py-1.5 rounded-full transition ${lang === "hi" ? "bg-clinic-primary text-white" : "text-clinic-muted"}`}
              >
                हिं
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-clinic-primary flex items-center justify-center">
              <Pill className="w-6 h-6 text-clinic-bg" strokeWidth={2} />
            </div>
            <div>
              <div className="font-heading font-bold text-clinic-text text-xl leading-none">{t("app_name")}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-clinic-muted mt-1">Care Reminders</div>
            </div>
          </div>

          <h2 className="font-heading text-4xl font-bold text-clinic-text tracking-tight mb-3 leading-tight">
            {t("tagline")}
          </h2>
          <p className="text-base text-clinic-muted mb-10 leading-relaxed">{t("login_subtitle")}</p>

          <button
            data-testid="google-login-btn"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-clinic-primary text-white rounded-2xl font-medium hover:bg-clinic-primaryHover transition active:scale-[0.99]"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.4-4.4 5.8l6.3 5.3C41.2 36 44 30.5 44 24c0-1.3-.1-2.6-.4-3.5z"/>
            </svg>
            {t("login_cta")}
          </button>

          <div className="mt-10 pt-6 border-t border-clinic-border text-xs text-clinic-muted">
            Secured by Emergent Auth · Your data never leaves your clinic
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
