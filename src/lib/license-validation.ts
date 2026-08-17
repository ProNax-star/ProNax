// ProNax License Validation System
// This module ensures only licensed users can use the software
import { SignJWT, jwtVerify } from 'jose';

// License types
export interface LicenseData {
  licenseKey: string;
  hwid: string;
  domain?: string;
  ip?: string;
  expiryDate: string;
  features: string[];
  userId: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  licenseData?: LicenseData;
}

// Hardware ID generation (browser fingerprinting)
export async function generateHWID(): Promise<string> {
  const components: string[] = [];
  
  try {
    // Screen info
    components.push(`${screen.width}x${screen.height}`);
    components.push(screen.colorDepth.toString());
    
    // Browser info
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(navigator.platform);
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Hardware concurrency
    if (navigator.hardwareConcurrency) {
      components.push(navigator.hardwareConcurrency.toString());
    }
    
    // Device memory
    if ((navigator as any).deviceMemory) {
      components.push((navigator as any).deviceMemory.toString());
    }
    
    // WebGL fingerprint
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
    
    // Create hash
    const data = components.join('|');
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.substring(0, 32); // First 32 chars as HWID
  } catch (error) {
    console.error('HWID generation failed:', error);
    // Fallback to simple fingerprint
    const fallback = navigator.userAgent + navigator.language + screen.width.toString();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fallback));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }
}

// Get current domain
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
}

// Get current IP (client-side approximation)
export async function getCurrentIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('IP detection failed:', error);
    return 'unknown';
  }
}

// Validate license key format
export function validateLicenseKeyFormat(key: string): boolean {
  // Expected format: PRNX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
  const regex = /^PRNX-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  return regex.test(key);
}

// Parse JWT license token
export async function parseLicenseToken(token: string): Promise<LicenseData | null> {
  try {
    const secret = new TextEncoder().encode(process.env.VITE_LICENSE_SECRET || 'pronax-secret-key-2026');
    const { payload } = await jwtVerify(token, secret);
    return payload as LicenseData;
  } catch (error) {
    console.error('License token parsing failed:', error);
    return null;
  }
}

// Main license validation function
export async function validateLicense(licenseKey: string): Promise<ValidationResult> {
  try {
    // Check if license validation is enabled
    if (typeof __LICENSE_ENABLED__ !== 'undefined' && !__LICENSE_ENABLED__) {
      return { valid: true }; // Disabled in development
    }
    
    // Validate license key format
    if (!validateLicenseKeyFormat(licenseKey)) {
      return { valid: false, error: 'Invalid license key format' };
    }
    
    // Parse license token (assuming licenseKey is a JWT)
    const licenseData = await parseLicenseToken(licenseKey);
    if (!licenseData) {
      return { valid: false, error: 'Invalid license token' };
    }
    
    // Check expiry
    const expiryDate = new Date(licenseData.expiryDate);
    if (expiryDate < new Date()) {
      return { valid: false, error: 'License has expired' };
    }
    
    // HWID binding check
    if (typeof __HWID_BINDING__ !== 'undefined' && __HWID_BINDING__) {
      const currentHWID = await generateHWID();
      if (licenseData.hwid !== currentHWID) {
        return { valid: false, error: 'License is not valid for this hardware' };
      }
    }
    
    // Domain restriction check
    if (typeof __DOMAIN_RESTRICTION__ !== 'undefined' && __DOMAIN_RESTRICTION__ && licenseData.domain) {
      const currentDomain = getCurrentDomain();
      if (licenseData.domain !== currentDomain && licenseData.domain !== '*') {
        return { valid: false, error: `License is not valid for domain: ${currentDomain}` };
      }
    }
    
    // IP restriction check (if specified)
    if (licenseData.ip && licenseData.ip !== '*') {
      const currentIP = await getCurrentIP();
      if (licenseData.ip !== currentIP) {
        return { valid: false, error: 'License is not valid for this IP address' };
      }
    }
    
    return { valid: true, licenseData };
  } catch (error) {
    console.error('License validation error:', error);
    return { valid: false, error: 'License validation failed' };
  }
}

// Server-side license verification (for critical operations)
export async function verifyLicenseOnline(licenseKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('/api/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });
    
    if (!response.ok) {
      return { valid: false, error: 'Online verification failed' };
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Online license verification failed:', error);
    // Fall back to offline validation
    return validateLicense(licenseKey);
  }
}

// Store license in localStorage
export function storeLicense(licenseKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pronax_license_key', licenseKey);
  }
}

// Retrieve license from localStorage
export function getStoredLicense(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pronax_license_key');
  }
  return null;
}

// Clear license from localStorage
export function clearLicense(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pronax_license_key');
  }
}

// License check hook for React components
export function useLicenseCheck() {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkLicense = async () => {
      const licenseKey = getStoredLicense();
      if (!licenseKey) {
        setIsValid(false);
        setError('No license key found');
        return;
      }
      
      const result = await validateLicense(licenseKey);
      setIsValid(result.valid);
      setError(result.error || null);
    };
    
    checkLicense();
  }, []);
  
  return { isValid, error };
}

import { useState, useEffect } from 'react';
