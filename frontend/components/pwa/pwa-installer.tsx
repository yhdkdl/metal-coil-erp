"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone, RefreshCw } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register Service Worker and aggressively check for updates
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Immediately check for updates
          reg.update();

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });

      // Reload when new SW controller activates
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Check if running in standalone display mode (already installed)
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia("(display-mode: standalone)").matches;
      // @ts-expect-error iOS Safari property
      const isIosStandalone = window.navigator.standalone === true;
      return isDisplayStandalone || isIosStandalone;
    };

    setIsStandalone(checkStandalone());

    // Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isAppleDevice);

    // Check localStorage dismissal
    const wasDismissed = sessionStorage.getItem("pwa_banner_dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }

    // Capture Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("pwa_banner_dismissed", "true");
  }

  async function handleForceUpdate() {
    if (typeof window === "undefined") return;
    try {
      if (window.caches) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
    } catch {
      // Ignore cache clearing errors
    }
    window.location.reload();
  }

  return (
    <>
      {/* Top New-Version Alert Banner (Shows when code was updated on server) */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            <span>New updates deployed! Refresh to load the latest version.</span>
          </div>
          <button
            onClick={handleForceUpdate}
            className="rounded-lg bg-slate-950 px-3 py-1 text-white text-xs font-semibold hover:bg-slate-800"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Floating Installation Banner for Mobile */}
      {!isStandalone && !installed && !dismissed && (deferredPrompt || isIos) && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-[#101923]/95 p-3.5 shadow-2xl backdrop-blur-md text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-slate-950 shadow-md">
                <span className="text-sm font-black">MC</span>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Install Mobile App
                </h4>
                <p className="text-xs text-slate-300">
                  Add Metal Coil to your home screen for full-screen standalone access.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300 active:scale-95"
              >
                {isIos ? (
                  <>
                    <Share size={14} />
                    <span>How to Add</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Install</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#101923] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="text-amber-400" size={20} />
                <h3 className="text-sm font-bold">Add to iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white">Tap the Share button</p>
                  <p className="mt-0.5 text-slate-400">
                    In Safari&apos;s bottom toolbar, tap the square icon with an upward arrow (<Share className="inline" size={12} />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white">Select &quot;Add to Home Screen&quot;</p>
                  <p className="mt-0.5 text-slate-400">
                    Scroll down the options list and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">
                  3
                </span>
                <div>
                  <p className="font-semibold text-white">Tap &quot;Add&quot;</p>
                  <p className="mt-0.5 text-slate-400">
                    Confirm in the top right corner. The Metal Coil app icon will appear directly on your phone&apos;s home screen!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-6 w-full rounded-xl bg-amber-400 py-2.5 text-center text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
