"use client";

import { useState, useEffect } from "react";

export interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1400);
    const fadeTimer = setTimeout(() => setFadeOut(true), 2800);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-600 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "linear-gradient(135deg, #0a1628 0%, #122040 40%, #1a3060 100%)" }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/10"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 4 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Glow effect behind logo */}
      <div
        className={`absolute w-80 h-80 rounded-full transition-all duration-1000 ${
          phase >= 1 ? "opacity-30 scale-100" : "opacity-0 scale-50"
        }`}
        style={{ background: "radial-gradient(circle, #89BE30 0%, transparent 70%)" }}
      />

      <div className="relative text-center">
        {/* Logo */}
        <div className="relative mb-10">
          <div
            className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center transition-all duration-700 ${
              phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
            style={{
              background: "linear-gradient(135deg, #89BE30 0%, #6a9a20 100%)",
              boxShadow: "0 0 60px rgba(137, 190, 48, 0.4), 0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Chart icon inside logo */}
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>

          {/* Ping rings */}
          <div
            className={`absolute inset-0 w-28 h-28 mx-auto rounded-3xl border-2 border-primary/20 transition-opacity duration-500 ${
              phase >= 1 ? "opacity-100 animate-ping" : "opacity-0"
            }`}
            style={{ animationDuration: "2s" }}
          />
          <div
            className={`absolute inset-0 w-28 h-28 mx-auto rounded-3xl border border-primary/10 transition-opacity duration-500 ${
              phase >= 1 ? "opacity-100 animate-ping" : "opacity-0"
            }`}
            style={{ animationDuration: "2s", animationDelay: "0.5s" }}
          />
        </div>

        {/* Brand name */}
        <div
          className={`transition-all duration-700 ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h1
            className="text-5xl font-extrabold mb-3 tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #89BE30 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FluxFin
          </h1>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
            <p className="text-white/50 text-sm font-medium tracking-widest uppercase">
              Controle Orçamentário
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </div>

        {/* Tagline */}
        <div
          className={`transition-all duration-700 delay-200 ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <p className="text-white/30 text-xs tracking-wider">
            Projetos de P&D &bull; ANEEL &bull; EVM
          </p>
        </div>

        {/* Loading dots */}
        <div
          className={`mt-12 transition-opacity duration-500 ${
            phase >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
