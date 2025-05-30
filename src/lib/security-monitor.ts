import { logger } from './logger';

/**
 * Security monitoring and alerting system
 */

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    ip?: string;
    userAgent?: string;
    userId?: string;
    endpoint?: string;
    additionalInfo?: Record<string, any>;
  };
  timestamp: Date;
}

export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_ATTACK_DETECTED = 'CSRF_ATTACK_DETECTED',
  INVALID_SESSION = 'INVALID_SESSION',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  API_ABUSE = 'API_ABUSE',
  INPUT_VALIDATION_FAILED = 'INPUT_VALIDATION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  IMPERSONATION_STARTED = 'IMPERSONATION_STARTED',
  IMPERSONATION_ENDED = 'IMPERSONATION_ENDED',
  SECRET_ROTATION = 'SECRET_ROTATION',
  TOKEN_REVOKED = 'TOKEN_REVOKED'
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  private alertThresholds = {
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: { count: 10, timeWindowMs: 60000 }, // 10 in 1 minute
    [SecurityEventType.CSRF_ATTACK_DETECTED]: { count: 3, timeWindowMs: 60000 },   // 3 in 1 minute
    [SecurityEventType.UNAUTHORIZED_ACCESS]: { count: 5, timeWindowMs: 300000 },   // 5 in 5 minutes
    [SecurityEventType.API_ABUSE]: { count: 20, timeWindowMs: 300000 },            // 20 in 5 minutes
  };

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log the event
    logger.warn(`Security Event: ${event.type}`, {
      severity: event.severity,
      details: event.details
    });

    // Check if we need to trigger an alert
    this.checkForAlerts(event.type, securityEvent);
  }

  /**
   * Check if we should trigger an alert based on event frequency
   */
  private checkForAlerts(eventType: SecurityEventType, currentEvent: SecurityEvent): void {
    const threshold = this.alertThresholds[eventType as keyof typeof this.alertThresholds];
    if (!threshold) return;

    const now = currentEvent.timestamp.getTime();
    const windowStart = now - threshold.timeWindowMs;

    const recentEvents = this.events.filter(
      event => event.type === eventType && 
               event.timestamp.getTime() >= windowStart
    );

    if (recentEvents.length >= threshold.count) {
      this.triggerAlert(eventType, recentEvents, currentEvent);
    }
  }

  /**
   * Trigger a security alert
   */
  private triggerAlert(
    eventType: SecurityEventType, 
    recentEvents: SecurityEvent[], 
    triggerEvent: SecurityEvent
  ): void {
    const alertDetails = {
      eventType,
      eventCount: recentEvents.length,
      timeWindow: this.alertThresholds[eventType as keyof typeof this.alertThresholds]?.timeWindowMs,
      triggerEvent: {
        ip: triggerEvent.details.ip,
        endpoint: triggerEvent.details.endpoint,
        userId: triggerEvent.details.userId
      },
      recentEventDetails: recentEvents.slice(-5).map(e => ({
        timestamp: e.timestamp,
        ip: e.details.ip,
        endpoint: e.details.endpoint
      }))
    };

    logger.error(`SECURITY ALERT: ${eventType} threshold exceeded`, alertDetails);

    // In production, you would send this to:
    // - Email alerts
    // - Slack/Teams notifications  
    // - SIEM systems
    // - External monitoring services
    
    // For now, we'll just log at error level
    console.error('🚨 SECURITY ALERT 🚨', {
      type: eventType,
      severity: 'CRITICAL',
      details: alertDetails
    });
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentAlerts: number;
  } {
    const eventsByType: Record<string, number> = {};
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    let recentAlerts = 0;

    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      if (event.severity === 'critical' && event.timestamp.getTime() > oneHourAgo) {
        recentAlerts++;
      }
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      recentAlerts
    };
  }

  /**
   * Clear old events (call periodically)
   */
  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.events = this.events.filter(
      event => event.timestamp.getTime() > oneWeekAgo
    );
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Cleanup every hour
setInterval(() => {
  securityMonitor.cleanup();
}, 60 * 60 * 1000);

// Convenience functions for common events
export const logRateLimitExceeded = (ip: string, endpoint: string) => {
  securityMonitor.logEvent({
    type: SecurityEventType.RATE_LIMIT_EXCEEDED,
    severity: 'medium',
    details: { ip, endpoint }
  });
};

export const logCSRFAttack = (ip: string, endpoint: string, userAgent?: string) => {
  securityMonitor.logEvent({
    type: SecurityEventType.CSRF_ATTACK_DETECTED,
    severity: 'high',
    details: { ip, endpoint, userAgent }
  });
};

export const logUnauthorizedAccess = (ip: string, endpoint: string, userId?: string) => {
  securityMonitor.logEvent({
    type: SecurityEventType.UNAUTHORIZED_ACCESS,
    severity: 'high',
    details: { ip, endpoint, userId }
  });
};

export const logImpersonationEvent = (adminId: string, targetUserId: string, action: 'started' | 'ended') => {
  securityMonitor.logEvent({
    type: action === 'started' ? SecurityEventType.IMPERSONATION_STARTED : SecurityEventType.IMPERSONATION_ENDED,
    severity: 'medium',
    details: { 
      userId: adminId,
      additionalInfo: { targetUserId, action }
    }
  });
};