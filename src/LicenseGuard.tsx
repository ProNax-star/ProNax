/*
 * ProNax - License Guard Component
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

import { useEffect, useState } from "react";
import { validateLicense, LicenseStatus, getLicenseInfo } from "@/lib/license";
import { AlertCircle, Shield, XCircle, Clock } from "lucide-react";

interface LicenseGuardProps {
  children: React.ReactNode;
}

export function LicenseGuard({ children }: LicenseGuardProps) {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkLicense() {
      try {
        const result = await validateLicense();
        setLicenseStatus(result.status);
        setErrorMessage(result.message);
      } catch (error) {
        setLicenseStatus(LicenseStatus.INVALID);
        setErrorMessage("License validation failed. Please contact support.");
      } finally {
        setIsLoading(false);
      }
    }

    checkLicense();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Validating license...</p>
        </div>
      </div>
    );
  }

  if (licenseStatus !== LicenseStatus.VALID) {
    return <LicenseErrorScreen status={licenseStatus} message={errorMessage} />;
  }

  return <>{children}</>;
}

function LicenseErrorScreen({ status, message }: { status: LicenseStatus | null; message: string }) {
  const licenseInfo = status === LicenseStatus.VALID ? getLicenseInfo({ status, message }) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            {/* Icon based on status */}
            <div className="mb-6">
              {status === LicenseStatus.EXPIRED ? (
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">
              {status === LicenseStatus.EXPIRED ? "License Expired" : "Invalid License"}
            </h1>

            {/* Status badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                <Shield className="w-4 h-4" />
                {status === LicenseStatus.MISSING_KEY && "License Key Missing"}
                {status === LicenseStatus.INVALID && "Invalid License Key"}
                {status === LicenseStatus.EXPIRED && "License Expired"}
                {status === LicenseStatus.HWID_MISMATCH && "Hardware Mismatch"}
                {status === LicenseStatus.DOMAIN_MISMATCH && "Domain Mismatch"}
              </span>
            </div>

            {/* Error message */}
            <p className="text-slate-400 mb-6 leading-relaxed">{message}</p>

            {/* License info if available */}
            {licenseInfo && (
              <div className="w-full bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  {licenseInfo.licensee && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Licensee:</span>
                      <span className="text-slate-300">{licenseInfo.licensee}</span>
                    </div>
                  )}
                  {licenseInfo.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expires:</span>
                      <span className="text-slate-300">
                        {licenseInfo.expiresAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {licenseInfo.domain && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Domain:</span>
                      <span className="text-slate-300">{licenseInfo.domain}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="w-full space-y-3">
              {status === LicenseStatus.MISSING_KEY ? (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-cyan-400 font-medium mb-1">License Key Required</p>
                      <p className="text-slate-400 text-sm">
                        Please set the VITE_LICENSE_KEY environment variable to activate your license.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-3">
                    If you believe this is an error, please contact support with your license details.
                  </p>
                  <a
                    href={`mailto:support@pronax.com?subject=License Issue - ${status}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Contact Support
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-slate-600 text-xs">
                ProNax © 2026. All rights reserved. Commercial Single-End Product License.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
