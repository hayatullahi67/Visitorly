"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWAInstall({ compact = false }: { compact?: boolean }) {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent || "";
    setIsIos(/iphone|ipad|ipod/i.test(ua));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Visitorly service worker registration failed:", error);
      });
    }

    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
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
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
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

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Smartphone className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Download Visitorly App</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm text-slate-600">
              {isIos ? (
                <>
                  <p className="font-medium text-slate-900">Install on iPhone / iPad (Safari):</p>
                  <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed">
                    <li>
                      Tap the <span className="inline-flex items-center gap-1 font-semibold text-slate-900"><Share className="h-3.5 w-3.5" /> Share</span> button in Safari&apos;s toolbar.
                    </li>
                    <li>
                      Scroll down and tap <span className="font-semibold text-slate-900">Add to Home Screen</span>.
                    </li>
                    <li>
                      Tap <span className="font-semibold text-slate-900">Add</span> to install Visitorly as an app.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-900">Install Visitorly on your device:</p>
                  <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed">
                    <li>
                      In Chrome, Edge, or Brave, look for the <span className="font-semibold text-slate-900">Install</span> icon on the right side of the address bar, or open the browser menu (<span className="font-semibold text-slate-900">⋮</span>).
                    </li>
                    <li>
                      Select <span className="font-semibold text-slate-900">Install Visitorly</span> (or <span className="font-semibold text-slate-900">Add to Home screen</span> on Android).
                    </li>
                  </ol>
                </>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
