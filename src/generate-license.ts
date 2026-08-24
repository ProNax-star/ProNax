/*
 * ProNax - License Key Generation Script
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 * 
 * This script is for license issuers only. Do not distribute to customers.
 */

import { SignJWT } from 'jose';
import crypto from 'crypto';

interface LicenseParams {
  licensee: string;
  domain?: string;
  ip?: string;
  hwid?: string;
  durationDays: number;
  features: string[];
}

// Get command line arguments
const args = process.argv.slice(2);

// Parse arguments
const params: Partial<LicenseParams> = {
  features: []
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[i + 1];
    
    switch (key) {
      case 'licensee':
        params.licensee = value;
        i++;
        break;
      case 'domain':
        params.domain = value;
        i++;
        break;
      case 'ip':
        params.ip = value;
        i++;
        break;
      case 'hwid':
        params.hwid = value;
        i++;
        break;
      case 'duration':
        params.durationDays = parseInt(value, 10);
        i++;
        break;
      case 'features':
        params.features = value.split(',').map((f: string) => f.trim());
        i++;
        break;
      case 'secret':
        process.env.LICENSE_SECRET = value;
        i++;
        break;
    }
  }
}

// Validate required parameters
if (!params.licensee) {
  console.error('Error: --licensee is required');
  console.log('Usage: node generate-license.ts --licensee <name> --duration <days> --features <feature1,feature2> [--domain <domain>] [--hwid <hwid>] [--secret <secret>]');
  process.exit(1);
}

if (!params.durationDays) {
  console.error('Error: --duration is required');
  console.log('Usage: node generate-license.ts --licensee <name> --duration <days> --features <feature1,feature2> [--domain <domain>] [--hwid <hwid>] [--secret <secret>]');
  process.exit(1);
}

if (!params.features || params.features.length === 0) {
  console.error('Error: --features is required');
  console.log('Usage: node generate-license.ts --licensee <name> --duration <days> --features <feature1,feature2> [--domain <domain>] [--hwid <hwid>] [--secret <secret>]');
  process.exit(1);
}

// Get secret from environment or use default
const secret = process.env.LICENSE_SECRET || 'pronax-default-secret-change-in-production';
const LICENSE_SECRET = new TextEncoder().encode(secret);

// Generate license key
async function generateLicenseKey(params: LicenseParams): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (params.durationDays * 24 * 60 * 60);
  
  // Generate a placeholder HWID if not provided (customer will need to provide their actual HWID)
  const hwid = params.hwid || crypto.randomBytes(32).toString('hex');

  const payload = {
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

// Generate and display the license key
generateLicenseKey(params as LicenseParams)
  .then(licenseKey => {
    console.log('='.repeat(80));
    console.log('ProNax License Key Generated Successfully');
    console.log('='.repeat(80));
    console.log();
    console.log('Licensee:', params.licensee);
    console.log('Duration:', params.durationDays, 'days');
    console.log('Features:', (params.features || []).join(', '));
    if (params.domain) console.log('Domain:', params.domain);
    if (params.hwid) console.log('HWID:', params.hwid);
    console.log();
    console.log('LICENSE KEY (copy this to your .env file):');
    console.log('-'.repeat(80));
    console.log(licenseKey);
    console.log('-'.repeat(80));
    console.log();
    console.log('Add this to your .env file:');
    console.log('VITE_LICENSE_KEY=' + licenseKey);
    console.log();
    console.log('IMPORTANT:');
    console.log('- Keep this license key secure and do not share it publicly');
    console.log('- If HWID was not provided, the customer will need to provide their HWID');
    console.log('- Contact support@pronax.com for assistance with HWID binding');
    console.log();
  })
  .catch(error => {
    console.error('Error generating license key:', error);
    process.exit(1);
  });
