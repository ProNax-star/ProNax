/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { getConsent, setConsent, type Consent } from "@/lib/consent";

/**
 * GDPR cookie banner. Nothing beyond strictly necessary storage is used until
 * the visitor makes a choice; analytics/advertising code gates on
 * `hasConsent()`.
 */
export function CookieConsent() {
  const [consent, setLocal] = useState<Consent | null | undefined>(undefined);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [advertising, setAdvertising] = useState(true);

  useEffect(() => {
    setLocal(getConsent());
  }, []);

  const decide = async (choice: { analytics: boolean; advertising: boolean }) => {
    const saved = await setConsent(choice);
    setLocal(saved);
  };

  if (consent === undefined || consent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        role="dialog"
        aria-label="Cookie preferences"
        className="fixed inset-x-3 bottom-20 lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-md z-[70] bg-card border border-primary/30 rounded-2xl p-4 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">We value your privacy</h2>
            <p className="text-xs text-muted-foreground mt-1">
              We use strictly necessary cookies to keep you signed in. With your consent we also use
              analytics to improve the platform and advertising cookies that fund creator payouts.{" "}
              <Link to="/p/privacy" className="text-primary hover:underline">
                Privacy policy
              </Link>
            </p>

            {customizing && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Strictly necessary</span>
                  <input type="checkbox" checked disabled className="accent-primary" />
                </label>
                <label className="flex items-center justify-between gap-3 text-xs text-foreground">
                  <span>Analytics</span>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-xs text-foreground">
                  <span>Advertising</span>
                  <input
                    type="checkbox"
                    checked={advertising}
                    onChange={(e) => setAdvertising(e.target.checked)}
                    className="accent-primary"
                  />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() =>
                  customizing
                    ? void decide({ analytics, advertising })
                    : void decide({ analytics: true, advertising: true })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-primary-foreground"
              >
                {customizing ? "Save preferences" : "Accept all"}
              </button>
              <button
                onClick={() => void decide({ analytics: false, advertising: false })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold glass border border-border/50 text-foreground"
              >
                Reject non-essential
              </button>
              {!customizing && (
                <button
                  onClick={() => setCustomizing(true)}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                >
                  Customize
                </button>
              )}
            </div>
          </div>
          <button
            aria-label="Reject non-essential cookies and close"
            onClick={() => void decide({ analytics: false, advertising: false })}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
