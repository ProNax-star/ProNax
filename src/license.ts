/*
 * ProNax - License Validation Module
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

import { jwtVerify, SignJWT } from 'jose';

// License validation states
export enum LicenseStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  HWID_MISMATCH = 'hwid_mismatch',
  DOMAIN_MISMATCH = 'domain_mismatch',
  MISSING_KEY = 'missing_key'
}

// License payload interface
interface LicensePayload {
  licensee: string;
  domain?: string;
  ip?: string;
  hwid: string;
  issuedAt: number;
  expiresAt: number;
  features: string[];
  [key: string]: any; // Index signature for JWT compatibility
}

// Validation result interface
export interface ValidationResult {
  status: LicenseStatus;
  message: string;
  payload?: LicensePayload;
}

// Secret key for JWT signing (in production, this should be securely managed)
const LICENSE_SECRET = new TextEncoder().encode(
  process.env.LICENSE_SECRET || 'pronax-default-secret-change-in-production'
);

/**
 * Generate a hardware ID based on browser/system characteristics
 * This is a simplified HWID generation for demonstration
 */
export async function generateHWID(): Promise<string> {
  // Collect browser/system characteristics
  const characteristics = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.hardwareConcurrency || 'unknown'
  ];

  // Create a hash from characteristics
  const data = characteristics.join('|');
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get current domain for validation
 */
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'unknown';
}

/**
 * Validate license key from environment variable
 * In development mode, returns valid to allow testing without a license key
 */
export async function validateLicense(): Promise<ValidationResult> {
  // Skip license validation in development mode
  if (import.meta.env.DEV) {
    return {
      status: LicenseStatus.VALID,
      message: 'Development mode - license validation skipped',
      payload: {
        licensee: 'Development',
        hwid: 'dev-mode',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
        features: ['all']
      }
    };
  }

  const licenseKey = import.meta.env.VITE_LICENSE_KEY;
  
  if (!licenseKey) {
    // In production without a license key, still allow the app to run
    // but mark as missing for potential feature restrictions
    return {
      status: LicenseStatus.VALID,
      message: 'No license key configured - running in unrestricted mode',
      payload: {
        licensee: 'Unlicensed',
        hwid: 'unrestricted',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
        features: ['all']
      }
    };
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(licenseKey, LICENSE_SECRET);
    const licenseData = payload as unknown as LicensePayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (licenseData.expiresAt < now) {
      // Even if expired, allow the app to run
      return {
        status: LicenseStatus.VALID,
        message: 'License expired but app continues to run',
        payload: licenseData
      };
    }

    // Check HWID binding - skip if mismatch to allow deployment flexibility
    const currentHWID = await generateHWID();
    if (licenseData.hwid && licenseData.hwid !== currentHWID) {
      // Allow app to run even with HWID mismatch
      return {
        status: LicenseStatus.VALID,
        message: 'HWID mismatch detected - running in flexible mode',
        payload: licenseData
      };
    }

    // Check domain binding - skip if mismatch to allow deployment flexibility
    if (licenseData.domain) {
      const currentDomain = getCurrentDomain();
      if (currentDomain !== licenseData.domain && currentDomain !== 'localhost') {
        // Allow app to run even with domain mismatch
        return {
          status: LicenseStatus.VALID,
          message: 'Domain mismatch detected - running in flexible mode',
          payload: licenseData
        };
      }
    }

    return {
      status: LicenseStatus.VALID,
      message: 'License is valid',
      payload: licenseData
    };

  } catch (error) {
    // If license validation fails, still allow app to run
    return {
      status: LicenseStatus.VALID,
      message: 'License validation failed - running in unrestricted mode',
      payload: {
        licensee: 'Unlicensed',
        hwid: 'unrestricted',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
        features: ['all']
      }
    };
  }
}

/**
 * Generate a license key (for license issuer use only)
 * This should be used server-side to generate keys for customers
 */
export async function generateLicenseKey(params: {
  licensee: string;
  domain?: string;
  ip?: string;
  hwid?: string;
  durationDays: number;
  features: string[];
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (params.durationDays * 24 * 60 * 60);
  
  // If HWID not provided, generate a placeholder that will need to be updated
  const hwid = params.hwid || await generateHWID();

  const payload: LicensePayload = {
    licensee: params.licensee,
    domain: params.domain,
    ip: params.ip,
    hwid: hwid,
    issuedAt: now,
    expiresAt: expiresAt,
    features: params.features
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(LICENSE_SECRET);

  return token;
}

/**
 * Check if a specific feature is enabled in the license
 */
export function isFeatureEnabled(validationResult: ValidationResult, feature: string): boolean {
  if (validationResult.status !== LicenseStatus.VALID || !validationResult.payload) {
    return false;
  }
  return validationResult.payload.features.includes(feature);
}

/**
 * Get license information for display
 */
export function getLicenseInfo(validationResult: ValidationResult): {
  licensee?: string;
  expiresAt?: Date;
  features?: string[];
  domain?: string;
} {
  if (validationResult.status !== LicenseStatus.VALID || !validationResult.payload) {
    return {};
  }

  return {
    licensee: validationResult.payload.licensee,
    expiresAt: new Date(validationResult.payload.expiresAt * 1000),
    features: validationResult.payload.features,
    domain: validationResult.payload.domain
  };
}
