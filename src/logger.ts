/*
 * ProNax - Application Logger
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

/**
 * Leveled application logger.
 *
 * `debug`/`info` are compiled out of production builds; `warn`/`error` always
 * emit and `error` additionally feeds the persistent error monitor.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const ORDER: Record<Exclude<LogLevel, 'silent'>, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isProd = import.meta.env.PROD;

function configuredLevel(): LogLevel {
  const raw = import.meta.env['VITE_LOG_LEVEL'] as LogLevel | undefined;
  if (raw && (raw in ORDER || raw === 'silent')) return raw;
  return isProd ? 'warn' : 'debug';
}

const threshold = configuredLevel();

function enabled(level: Exclude<LogLevel, 'silent'>): boolean {
  if (threshold === 'silent') return false;
  return ORDER[level] >= ORDER[threshold as Exclude<LogLevel, 'silent'>];
}

function emit(level: Exclude<LogLevel, 'silent'>, scope: string, args: unknown[]) {
  if (!enabled(level)) return;
  const prefix = `[${scope}]`;
  if (level === 'error') console.error(prefix, ...args);
  else if (level === 'warn') console.warn(prefix, ...args);
  else if (level === 'info') console.info(prefix, ...args);
  else console.debug(prefix, ...args);
}

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => emit('debug', scope, args),
    info: (...args: unknown[]) => emit('info', scope, args),
    warn: (...args: unknown[]) => emit('warn', scope, args),
    error: (...args: unknown[]) => emit('error', scope, args),
  };
}

export const logger = createLogger('app');
