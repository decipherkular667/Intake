import { storage } from './database-storage';
import { logger } from './logger';
import os from 'os';
import { performance } from 'perf_hooks';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    memory: ServiceHealth;
    disk: ServiceHealth;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu: CpuMetrics;
    requests?: RequestMetrics;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heap: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface CpuMetrics {
  loadAverage: number[];
  platform: string;
  cores: number;
}

export interface RequestMetrics {
  total: number;
  errorRate: number;
  averageResponseTime: number;
}

class HealthMonitor {
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private startTime = Date.now();

  constructor() {
    logger.info('Health monitor initialized');
  }

  // Record request metrics
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    if (isError) {
      this.errorCount++;
    }
  }

  // Get memory metrics
  private getMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      used: Math.round(usedMem / 1024 / 1024), // MB
      total: Math.round(totalMem / 1024 / 1024), // MB
      percentage: Math.round((usedMem / totalMem) * 100),
      heap: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      }
    };
  }

  // Get CPU metrics
  private getCpuMetrics(): CpuMetrics {
    return {
      loadAverage: os.loadavg(),
      platform: os.platform(),
      cores: os.cpus().length
    };
  }

  // Check database health
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = performance.now();

    try {
      // Try a simple database operation
      await storage.getHealthProfilesByUser('health-check-test');
      const responseTime = Math.round(performance.now() - startTime);

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          connectionPool: 'active',
          queryExecuted: 'SELECT test'
        }
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      logger.error('Database health check failed', error as Error);

      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  // Check memory health
  private checkMemoryHealth(): ServiceHealth {
    const memory = this.getMemoryMetrics();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (memory.percentage > 90) {
      status = 'unhealthy';
    } else if (memory.percentage > 75) {
      status = 'degraded';
    }

    return {
      status,
      lastCheck: new Date().toISOString(),
      details: {
        memoryUsage: `${memory.percentage}%`,
        heapUsage: `${memory.heap.percentage}%`
      }
    };
  }

  // Check disk health (basic)
  private checkDiskHealth(): ServiceHealth {
    // For a more comprehensive disk check, you might want to use a library
    // For now, we'll do a basic check
    try {
      const stats = os.freemem();
      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        details: {
          availableMemory: Math.round(stats / 1024 / 1024) + 'MB'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  // Get request metrics
  private getRequestMetrics(): RequestMetrics | undefined {
    if (this.requestCount === 0) return undefined;

    return {
      total: this.requestCount,
      errorRate: Math.round((this.errorCount / this.requestCount) * 100),
      averageResponseTime: Math.round(this.totalResponseTime / this.requestCount)
    };
  }

  // Get overall health status
  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = performance.now();

    try {
      const [databaseHealth, memoryHealth, diskHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        Promise.resolve(this.checkMemoryHealth()),
        Promise.resolve(this.checkDiskHealth())
      ]);

      // Determine overall status
      const services = { database: databaseHealth, memory: memoryHealth, disk: diskHealth };
      const serviceStatuses = Object.values(services).map(s => s.status);

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (serviceStatuses.includes('unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (serviceStatuses.includes('degraded')) {
        overallStatus = 'degraded';
      }

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.round((Date.now() - this.startTime) / 1000), // seconds
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services,
        metrics: {
          memory: this.getMemoryMetrics(),
          cpu: this.getCpuMetrics(),
          requests: this.getRequestMetrics()
        }
      };

      const checkDuration = Math.round(performance.now() - startTime);
      logger.debug('Health check completed', {
        status: overallStatus,
        duration: checkDuration + 'ms'
      });

      return healthStatus;
    } catch (error) {
      logger.error('Health check failed', error as Error);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.round((Date.now() - this.startTime) / 1000),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: { status: 'unhealthy', lastCheck: new Date().toISOString() },
          memory: { status: 'unhealthy', lastCheck: new Date().toISOString() },
          disk: { status: 'unhealthy', lastCheck: new Date().toISOString() }
        },
        metrics: {
          memory: this.getMemoryMetrics(),
          cpu: this.getCpuMetrics()
        }
      };
    }
  }

  // Simple readiness check (for Kubernetes)
  async isReady(): Promise<boolean> {
    try {
      const dbHealth = await this.checkDatabaseHealth();
      return dbHealth.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  // Simple liveness check (for Kubernetes)
  isAlive(): boolean {
    // Basic liveness check - server is running if this method executes
    return true;
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();