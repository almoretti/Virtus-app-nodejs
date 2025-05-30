import { createHash, randomBytes } from 'crypto';
import { logger } from './logger';

/**
 * Secret management utilities for rotating API tokens and CSRF secrets
 */

export interface SecretRotationConfig {
  rotationIntervalMs: number;
  secretLength: number;
  algorithm: 'sha256' | 'sha512';
}

class SecretManager {
  private secrets = new Map<string, string>();
  private rotationTimers = new Map<string, NodeJS.Timeout>();
  
  private defaultConfig: SecretRotationConfig = {
    rotationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
    secretLength: 32,
    algorithm: 'sha256'
  };

  /**
   * Generate a new secret
   */
  generateSecret(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Get or create a secret with automatic rotation
   */
  getRotatingSecret(
    key: string, 
    config: Partial<SecretRotationConfig> = {}
  ): string {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (!this.secrets.has(key)) {
      this.secrets.set(key, this.generateSecret(finalConfig.secretLength));
      this.scheduleRotation(key, finalConfig);
      
      logger.info(`Generated new rotating secret for key: ${key}`);
    }
    
    return this.secrets.get(key)!;
  }

  /**
   * Manually rotate a secret
   */
  rotateSecret(key: string, config: Partial<SecretRotationConfig> = {}): string {
    const finalConfig = { ...this.defaultConfig, ...config };
    const newSecret = this.generateSecret(finalConfig.secretLength);
    
    this.secrets.set(key, newSecret);
    
    // Clear existing timer and schedule new one
    if (this.rotationTimers.has(key)) {
      clearTimeout(this.rotationTimers.get(key)!);
    }
    this.scheduleRotation(key, finalConfig);
    
    logger.warn(`Secret rotated for key: ${key}`);
    return newSecret;
  }

  /**
   * Schedule automatic rotation
   */
  private scheduleRotation(key: string, config: SecretRotationConfig): void {
    const timer = setTimeout(() => {
      this.rotateSecret(key, config);
    }, config.rotationIntervalMs);
    
    this.rotationTimers.set(key, timer);
  }

  /**
   * Get all active secret keys
   */
  getActiveKeys(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Clear all secrets and timers
   */
  clearAll(): void {
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    
    this.secrets.clear();
    this.rotationTimers.clear();
    
    logger.info('All secrets cleared');
  }

  /**
   * Hash a value with a secret
   */
  hashWithSecret(value: string, secretKey: string): string {
    const secret = this.getRotatingSecret(secretKey);
    return createHash('sha256')
      .update(value + secret)
      .digest('hex');
  }
}

// Export singleton instance
export const secretManager = new SecretManager();

// Cleanup on process exit
process.on('beforeExit', () => {
  secretManager.clearAll();
});

// Convenience functions
export const getCSRFSecret = () => 
  secretManager.getRotatingSecret('csrf', { rotationIntervalMs: 12 * 60 * 60 * 1000 }); // 12 hours

export const getAPITokenSalt = () =>
  secretManager.getRotatingSecret('api-token-salt', { rotationIntervalMs: 7 * 24 * 60 * 60 * 1000 }); // 7 days