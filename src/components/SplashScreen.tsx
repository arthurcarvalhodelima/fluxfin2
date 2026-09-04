"use client";

import { useState, useEffect } from "react";

export interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-secondary transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto fluxfin-gradient rounded-2xl flex items-center justify-center fluxfin-shadow-lg">
            <span className="text-text-on-primary text-5xl font-bold">F</span>
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-primary/30 rounded-2xl animate-ping" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          FluxFin
        </h1>
        <p className="text-white/60 text-sm mb-8">
          Controle Orcamentario
        </p>

        <div className="flex justify-center">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
