import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// BUILD_TIMESTAMP is set at client bundle load time
const APP_CURRENT_BUILD_TIME = new Date().toISOString();

interface UpdateNotificationProps {
  // Optional custom version or changes info if available
  appName?: string;
}

export default function UpdateNotification({ appName = "Mylogiz Sales CRM" }: UpdateNotificationProps) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateReason, setUpdateReason] = useState<string>("ตรวจพบเวอร์ชันใหม่ของระบบ");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Initial build marker setup
    const lastKnownBuild = localStorage.getItem("crm_app_build_version");
    if (!lastKnownBuild) {
      localStorage.setItem("crm_app_build_version", APP_CURRENT_BUILD_TIME);
    }

    // 2. Poll for updates by fetching index.html with cache busting periodically
    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/?_t=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache"
          }
        });

        const etag = res.headers.get("etag");
        const lastModified = res.headers.get("last-modified");
        const currentMarker = etag || lastModified;

        if (currentMarker) {
          const storedMarker = sessionStorage.getItem("crm_last_etag_marker");
          if (!storedMarker) {
            sessionStorage.setItem("crm_last_etag_marker", currentMarker);
          } else if (storedMarker !== currentMarker) {
            setUpdateReason("ระบบมีเวอร์ชันใหม่และฟีเจอร์ล่าสุดพร้อมใช้งาน");
            setHasUpdate(true);
          }
        }
      } catch (err) {
        // Silently catch fetch errors (e.g. temporary offline)
      }
    };

    // Check periodically (every 45 seconds) & when tab gains focus
    const interval = setInterval(checkForUpdates, 45000);
    const handleFocus = () => {
      checkForUpdates();
    };
    window.addEventListener("focus", handleFocus);

    // 3. Listen to ServiceWorker updates if active
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setUpdateReason("ระบบดาวน์โหลดข้อมูลอัปเดตเวอร์ชันใหม่สำเร็จแล้ว");
        setHasUpdate(true);
      });
    }

    // 4. Custom window event for instant update triggers (e.g. from websocket or manual broadcast)
    const handleSystemUpdateEvent = (e: any) => {
      if (e.detail?.reason) {
        setUpdateReason(e.detail.reason);
      }
      setHasUpdate(true);
      setIsDismissed(false);
    };
    window.addEventListener("crm:system-update-available", handleSystemUpdateEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("crm:system-update-available", handleSystemUpdateEvent);
    };
  }, []);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    // Store current build version marker
    localStorage.setItem("crm_app_build_version", new Date().toISOString());
    sessionStorage.removeItem("crm_last_etag_marker");

    // Smooth reload bypassing cache
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <AnimatePresence>
      {hasUpdate && !isDismissed && (
        <motion.aside
          id="system-update-notification-toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] sm:w-auto bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 backdrop-blur-xl"
        >
          {/* Glowing Animated Icon */}
          <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>มีอัปเดตระบบใหม่</span>
                <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[9px] font-extrabold uppercase">
                  New Version
                </span>
              </h4>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              {updateReason} กดปุ่มเพื่อโหลดเวอร์ชันล่าสุดได้ทันที
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
            <button
              id="apply-system-update-btn"
              type="button"
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
              <span>{isUpdating ? "กำลังอัปเดต..." : "อัปเดตเลย"}</span>
            </button>

            <button
              id="dismiss-system-update-btn"
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title="ไว้ภายหลัง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
