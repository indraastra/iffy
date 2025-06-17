/**
 * Shared CLI utilities for test runners
 */

import { config } from 'dotenv';

/**
 * Initialize dotenv and common CLI setup
 */
export function initializeCLI(): void {
  // Load environment variables from .env file
  config();
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generate a timestamp string for file names
 */
export function generateTimestamp(): string {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + '-' +
    String(now.getMinutes()).padStart(2, '0') + '-' +
    String(now.getSeconds()).padStart(2, '0');
}

/**
 * Common console header formatting
 */
export function printHeader(title: string): void {
  console.log(`🧪 ${title}`);
  console.log('='.repeat(title.length + 4));
  console.log('');
}

/**
 * Common success/failure exit handling
 */
export function exitWithResult(success: boolean, errorMessage?: string): void {
  if (!success && errorMessage) {
    console.error(`❌ ${errorMessage}`);
  }
  process.exit(success ? 0 : 1);
}