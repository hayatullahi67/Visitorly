"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, MoreVertical, Share, ShieldCheck, Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __visitorlyInstallPrompt?: InstallPromptEvent | null;
  }
}

export default function PWAInstall({ compact = false }: { compact?: boolean }) {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else if (/android/i.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    if (window.__visitorlyInstallPrompt) {
      setInstallEvent(window.__visitorlyInstallPrompt);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Visitorly service worker registration failed:", error);
      });
    }

    const handleInstall = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as InstallPromptEvent;
      window.__visitorlyInstallPrompt = promptEvent;
      setInstallEvent(promptEvent);
    };
    const handleInstalled = () => {
      window.__visitorlyInstallPrompt = null;
      setInstalled(true);
      setInstallEvent(null);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    const promptToUse = installEvent || window.__visitorlyInstallPrompt;
    if (promptToUse) {
      await promptToUse.prompt();
      const choice = await promptToUse.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      window.__visitorlyInstallPrompt = null;
      setInstallEvent(null);
      return;
    }
    setShowGuide(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            : "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:gap-2 sm:px-3.5 sm:text-sm"
        }
      >
        <Download className="h-4 w-4 text-indigo-600" />
        <span>Download App</span>
      </button>

      {mounted &&
        showGuide &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-900/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowGuide(false)}
          >
            <div
              className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Install Visitorly App</h3>
                    <p className="text-xs text-slate-500">Quick access right from your home screen</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {platform === "ios" && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      On iPhone / iPad (Safari)
                    </p>
                    <ol className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          1
                        </span>
                        <span>
                          Tap the{" "}
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                            <Share className="h-3.5 w-3.5 text-indigo-600" /> Share
                          </span>{" "}
                          button at the bottom of Safari.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          2
                        </span>
                        <span>
                          Scroll down and tap{" "}
                          <span className="font-semibold text-slate-900">Add to Home Screen</span>, then tap{" "}
                          <span className="font-semibold text-slate-900">Add</span>.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                {platform === "android" && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      On Android (Chrome / Edge)
                    </p>
                    <ol className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          1
                        </span>
                        <span>
                          Tap the{" "}
                          <span className="inline-flex items-center gap-0.5 font-semibold text-slate-900">
                            <MoreVertical className="h-3.5 w-3.5" /> menu
                          </span>{" "}
                          at the top-right corner of your browser.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          2
                        </span>
                        <span>
                          Tap <span className="font-semibold text-slate-900">Install app</span> or{" "}
                          <span className="font-semibold text-slate-900">Add to Home screen</span>.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                {platform === "desktop" && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      On Desktop (Chrome / Edge)
                    </p>
                    <ol className="space-y-2.5 text-sm text-slate-700">
                      <li className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          1
                        </span>
                        <span>
                          Click the <span className="font-semibold text-slate-900">Install</span> icon on the right side of the address bar, or open the browser menu (<span className="font-semibold text-slate-900">⋮</span>).
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                          2
                        </span>
                        <span>
                          Select <span className="font-semibold text-slate-900">Install Visitorly</span>.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-slate-600">
                  <Smartphone className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Installs in seconds with full-screen app experience.</span>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
