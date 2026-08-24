/*
 * ProNax - Cryptographic Utilities
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

// Build-time encryption for sensitive code and data (Browser-compatible)

// Simple XOR encryption for build-time obfuscation
export function xorEncrypt(data: string, key: string): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(result)
}

export function xorDecrypt(encrypted: string, key: string): string {
  const data = atob(encrypted)
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

// AES-256-GCM encryption for sensitive data (Web Crypto API)
export async function aesEncrypt(data: string, key: string): Promise<{ encrypted: string, iv: string, authTag: string }> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  )
  
  const encryptedArray = new Uint8Array(encrypted)
  const authTag = encryptedArray.slice(-16)
  const ciphertext = encryptedArray.slice(0, -16)
  
  return {
    encrypted: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag))
  }
}

export async function aesDecrypt(encrypted: string, key: string, iv: string, authTag: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const ciphertext = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
  const authTagArray = Uint8Array.from(atob(authTag), c => c.charCodeAt(0))
  
  const combined = new Uint8Array(ciphertext.length + authTagArray.length)
  combined.set(ciphertext)
  combined.set(authTagArray, ciphertext.length)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    cryptoKey,
    combined
  )
  
  return new TextDecoder().decode(decrypted)
}

// Generate secure hash (Web Crypto API)
export async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate random key (Web Crypto API)
export async function generateKey(length: number = 32): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Environment variable encryption for production
export function encryptEnvVar(value: string, encryptionKey: string): string {
  return xorEncrypt(value, encryptionKey)
}

export function decryptEnvVar(encrypted: string, encryptionKey: string): string {
  return xorDecrypt(encrypted, encryptionKey)
}

// License key generation (for admin use only)
export async function generateLicenseKey(): Promise<string> {
  const segments: string[] = []
  for (let i = 0; i < 6; i++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(3))
    const segment = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .substring(0, 5)
    segments.push(segment)
  }
  return `PRNX-${segments.join('-')}`
}

// Validate license key checksum
export function validateLicenseChecksum(licenseKey: string): boolean {
  // Remove prefix and split
  const parts = licenseKey.replace('PRNX-', '').split('-')
  if (parts.length !== 5) return false
  
  // Each part should be 5 characters
  for (const part of parts) {
    if (part.length !== 5 || !/^[A-Z0-9]+$/.test(part)) {
      return false
    }
  }
  
  return true
}

// Build-time constants encryption
const BUILD_ENCRYPTION_KEY = typeof process !== 'undefined' && process.env?.BUILD_ENCRYPTION_KEY 
  ? process.env.BUILD_ENCRYPTION_KEY 
  : 'pronax-build-2026-secure-key'

export function encryptBuildConstant(value: string): string {
  return xorEncrypt(value, BUILD_ENCRYPTION_KEY)
}

export function decryptBuildConstant(encrypted: string): string {
  return xorDecrypt(encrypted, BUILD_ENCRYPTION_KEY)
}

// API endpoint obfuscation
export function obfuscateEndpoint(endpoint: string): string {
  const encoded = btoa(endpoint)
  return encoded.split('').reverse().join('')
}

export function deobfuscateEndpoint(obfuscated: string): string {
  const reversed = obfuscated.split('').reverse().join('')
  return atob(reversed)
}
