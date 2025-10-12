module.exports = {
  apps: [{
    name: 'intakeai-health',
    script: 'npm',
    args: 'start',
    cwd: '/home/intakeai/intakeai-health',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Health monitoring
    kill_timeout: 5000,
    listen_timeout: 8000,
    // Automatic restart on crashes
    max_restarts: 10,
    min_uptime: '10s',
    // Memory monitoring
    max_memory_restart: '1G',
    // Performance monitoring
    instance_var: 'INSTANCE_ID'
  }]
};