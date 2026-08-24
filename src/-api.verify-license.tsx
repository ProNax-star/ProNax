/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
// ProNax License Verification API
// Server-side license validation for enhanced security
import { SignJWT, jwtVerify } from 'jose'

// License database interface (would be stored in your license database)
interface LicenseRecord {
  id: string
  licenseKey: string
  hwid: string
  domain?: string
  ip?: string
  expiryDate: string
  features: string[]
  userId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Mock license database (replace with actual database in production)
const licenseDatabase: Map<string, LicenseRecord> = new Map()

// Initialize with sample license (remove in production)
licenseDatabase.set('PRNX-DEMO-TEST-TEST-TEST-TEST', {
  id: 'demo-license-1',
  licenseKey: 'PRNX-DEMO-TEST-TEST-TEST-TEST',
  hwid: '*',
  domain: '*',
  ip: '*',
  expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  features: ['all'],
  userId: 'demo-user',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * JWT signing key for license tokens.
 *
 * Read per-call (env is injected per-request on the Worker runtime) and fails
 * closed. The previous hardcoded fallback was committed to the repo, so anyone
 * with the source could forge valid license tokens.
 */
function getLicenseSecret(): Uint8Array {
  const value = process.env['LICENSE_SECRET']
  if (!value) throw new Error('LICENSE_SECRET is not configured')
  return new TextEncoder().encode(value)
}

// Generate JWT license token
async function generateLicenseToken(licenseData: LicenseRecord): Promise<string> {
  const secret = getLicenseSecret()
  
  const token = await new SignJWT({
    licenseKey: licenseData.licenseKey,
    hwid: licenseData.hwid,
    domain: licenseData.domain,
    ip: licenseData.ip,
    expiryDate: licenseData.expiryDate,
    features: licenseData.features,
    userId: licenseData.userId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(licenseData.expiryDate)
    .sign(secret)
  
  return token
}

// Verify license token
async function verifyLicenseToken(token: string): Promise<any> {
  try {
    const secret = getLicenseSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    console.error('License token verification failed:', error)
    return null
  }
}

// GET /api/verify-license - Check license status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const licenseKey = searchParams.get('licenseKey')
    
    if (!licenseKey) {
      return Response.json(
        { valid: false, error: 'License key is required' },
        { status: 400 }
      )
    }
    
    // Check license in database
    const license = licenseDatabase.get(licenseKey)
    
    if (!license) {
      return Response.json(
        { valid: false, error: 'License not found' },
        { status: 404 }
      )
    }
    
    if (!license.isActive) {
      return Response.json(
        { valid: false, error: 'License is inactive' },
        { status: 403 }
      )
    }
    
    // Check expiry
    if (new Date(license.expiryDate) < new Date()) {
      return Response.json(
        { valid: false, error: 'License has expired' },
        { status: 403 }
      )
    }
    
    return Response.json({
      valid: true,
      licenseData: {
        licenseKey: license.licenseKey,
        hwid: license.hwid,
        domain: license.domain,
        ip: license.ip,
        expiryDate: license.expiryDate,
        features: license.features,
        userId: license.userId
      }
    })
  } catch (error) {
    console.error('License verification error:', error)
    return Response.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/verify-license - Verify license with HWID/domain/IP binding
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { licenseKey, hwid, domain, ip } = body
    
    if (!licenseKey) {
      return Response.json(
        { valid: false, error: 'License key is required' },
        { status: 400 }
      )
    }
    
    // Check license in database
    const license = licenseDatabase.get(licenseKey)
    
    if (!license) {
      return Response.json(
        { valid: false, error: 'License not found' },
        { status: 404 }
      )
    }
    
    if (!license.isActive) {
      return Response.json(
        { valid: false, error: 'License is inactive' },
        { status: 403 }
      )
    }
    
    // Check expiry
    if (new Date(license.expiryDate) < new Date()) {
      return Response.json(
        { valid: false, error: 'License has expired' },
        { status: 403 }
      )
    }
    
    // HWID binding check
    if (hwid && license.hwid !== '*' && license.hwid !== hwid) {
      return Response.json(
        { valid: false, error: 'License is not valid for this hardware' },
        { status: 403 }
      )
    }
    
    // Domain restriction check
    if (domain && license.domain && license.domain !== '*' && license.domain !== domain) {
      return Response.json(
        { valid: false, error: `License is not valid for domain: ${domain}` },
        { status: 403 }
      )
    }
    
    // IP restriction check
    if (ip && license.ip && license.ip !== '*' && license.ip !== ip) {
      return Response.json(
        { valid: false, error: 'License is not valid for this IP address' },
        { status: 403 }
      )
    }
    
    // Generate and return JWT token
    const token = await generateLicenseToken(license)
    
    return Response.json({
      valid: true,
      token,
      licenseData: {
        licenseKey: license.licenseKey,
        hwid: license.hwid,
        domain: license.domain,
        ip: license.ip,
        expiryDate: license.expiryDate,
        features: license.features,
        userId: license.userId
      }
    })
  } catch (error) {
    console.error('License verification error:', error)
    return Response.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/verify-license - Update license (admin only)
export async function PUT(request: Request) {
  try {
    // Add admin authentication here
    const body = await request.json()
    const { licenseKey, hwid, domain, ip, expiryDate, features, isActive } = body
    
    if (!licenseKey) {
      return Response.json(
        { valid: false, error: 'License key is required' },
        { status: 400 }
      )
    }
    
    const existingLicense = licenseDatabase.get(licenseKey)
    
    if (!existingLicense) {
      return Response.json(
        { valid: false, error: 'License not found' },
        { status: 404 }
      )
    }
    
    // Update license
    const updatedLicense: LicenseRecord = {
      ...existingLicense,
      hwid: hwid || existingLicense.hwid,
      domain: domain || existingLicense.domain,
      ip: ip || existingLicense.ip,
      expiryDate: expiryDate || existingLicense.expiryDate,
      features: features || existingLicense.features,
      isActive: isActive !== undefined ? isActive : existingLicense.isActive,
      updatedAt: new Date().toISOString()
    }
    
    licenseDatabase.set(licenseKey, updatedLicense)
    
    return Response.json({
      valid: true,
      licenseData: updatedLicense
    })
  } catch (error) {
    console.error('License update error:', error)
    return Response.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/verify-license - Revoke license (admin only)
export async function DELETE(request: Request) {
  try {
    // Add admin authentication here
    const { searchParams } = new URL(request.url)
    const licenseKey = searchParams.get('licenseKey')
    
    if (!licenseKey) {
      return Response.json(
        { valid: false, error: 'License key is required' },
        { status: 400 }
      )
    }
    
    const license = licenseDatabase.get(licenseKey)
    
    if (!license) {
      return Response.json(
        { valid: false, error: 'License not found' },
        { status: 404 }
      )
    }
    
    // Deactivate license instead of deleting
    license.isActive = false
    license.updatedAt = new Date().toISOString()
    licenseDatabase.set(licenseKey, license)
    
    return Response.json({
      valid: true,
      message: 'License revoked successfully'
    })
  } catch (error) {
    console.error('License revocation error:', error)
    return Response.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
