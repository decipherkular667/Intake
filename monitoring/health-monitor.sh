#!/bin/bash

# IntakeAI Health Monitoring Script for Closed Beta
# This script monitors the application health and sends alerts

# Configuration
APP_URL="https://yourdomain.com"
HEALTH_ENDPOINT="$APP_URL/api/health"
LIVE_ENDPOINT="$APP_URL/api/health/live"
READY_ENDPOINT="$APP_URL/api/health/ready"
EMAIL_ALERT="admin@yourdomain.com"
SLACK_WEBHOOK=""  # Optional: Add Slack webhook URL

# Log file
LOG_FILE="/var/log/intakeai-monitor.log"
ALERT_FILE="/tmp/intakeai-alerts"

# Create log file if it doesn't exist
touch $LOG_FILE

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to send email alert
send_email_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" $EMAIL_ALERT 2>/dev/null || \
    log_message "Failed to send email alert: $subject"
}

# Function to send Slack alert
send_slack_alert() {
    local message="$1"
    local color="$2"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            $SLACK_WEBHOOK 2>/dev/null || \
        log_message "Failed to send Slack alert"
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url="$1"
    local name="$2"
    local timeout="${3:-10}"

    local response=$(curl -s -w "%{http_code}|%{time_total}" \
        --max-time $timeout \
        "$url" 2>/dev/null)

    if [ $? -eq 0 ]; then
        local http_code=$(echo $response | cut -d'|' -f1)
        local response_time=$(echo $response | cut -d'|' -f2)

        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
            log_message "✅ $name: HTTP $http_code (${response_time}s)"
            return 0
        else
            log_message "❌ $name: HTTP $http_code (${response_time}s)"
            return 1
        fi
    else
        log_message "❌ $name: Connection failed"
        return 1
    fi
}

# Function to check application health
check_app_health() {
    local health_response=$(curl -s --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null)

    if [ $? -eq 0 ]; then
        local status=$(echo "$health_response" | jq -r '.data.status' 2>/dev/null)
        local memory_usage=$(echo "$health_response" | jq -r '.data.metrics.memory.percentage' 2>/dev/null)
        local db_status=$(echo "$health_response" | jq -r '.data.services.database.status' 2>/dev/null)

        log_message "🔍 Health Status: $status | Memory: ${memory_usage}% | DB: $db_status"

        # Check for degraded performance
        if [ "$status" = "degraded" ]; then
            send_alert "⚠️ IntakeAI Health: Degraded Performance" \
                "Application is running but performance is degraded.\n\nMemory Usage: ${memory_usage}%\nDatabase Status: $db_status"
            return 1
        elif [ "$status" = "unhealthy" ]; then
            send_alert "🚨 IntakeAI Health: Service Unhealthy" \
                "Application health check failed!\n\nStatus: $status\nMemory Usage: ${memory_usage}%\nDatabase Status: $db_status"
            return 2
        elif [ "${memory_usage%.*}" -gt 85 ] 2>/dev/null; then
            send_alert "⚠️ IntakeAI Health: High Memory Usage" \
                "Memory usage is high: ${memory_usage}%\n\nConsider investigating or restarting the service."
            return 1
        fi

        return 0
    else
        log_message "❌ Health check endpoint unreachable"
        return 3
    fi
}

# Function to check system resources
check_system_resources() {
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')

    if [ "$disk_usage" -gt 85 ]; then
        send_alert "💾 IntakeAI Health: Low Disk Space" \
            "Disk usage is at ${disk_usage}%\n\nPlease free up space on the server."
    fi

    # Check if PM2 process is running
    if command -v pm2 >/dev/null 2>&1; then
        local pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null)

        if [ "$pm2_status" != "online" ]; then
            send_alert "🔄 IntakeAI Health: PM2 Process Issue" \
                "PM2 process status: $pm2_status\n\nProcess may need to be restarted."
        fi
    fi
}

# Function to send alert (with rate limiting)
send_alert() {
    local subject="$1"
    local message="$2"
    local alert_key=$(echo "$subject" | tr ' ' '_')
    local current_time=$(date +%s)
    local last_alert_time=0

    # Rate limiting: don't send same alert within 30 minutes
    if [ -f "${ALERT_FILE}_${alert_key}" ]; then
        last_alert_time=$(cat "${ALERT_FILE}_${alert_key}")
    fi

    local time_diff=$((current_time - last_alert_time))

    if [ $time_diff -gt 1800 ]; then  # 30 minutes
        log_message "📧 Sending alert: $subject"
        send_email_alert "$subject" "$message"
        send_slack_alert "$subject\n$message" "danger"
        echo $current_time > "${ALERT_FILE}_${alert_key}"
    else
        log_message "⏰ Alert suppressed (sent recently): $subject"
    fi
}

# Function to send recovery notification
send_recovery_notification() {
    local subject="✅ IntakeAI Health: Service Recovered"
    local message="The IntakeAI Health application has recovered and is now operating normally."

    log_message "📧 Sending recovery notification"
    send_email_alert "$subject" "$message"
    send_slack_alert "$subject\n$message" "good"

    # Clear alert files
    rm -f ${ALERT_FILE}_*
}

# Main monitoring function
main() {
    log_message "🔍 Starting health check..."

    local failures=0

    # Check main application
    if ! check_endpoint "$APP_URL" "Main Application"; then
        failures=$((failures + 1))
    fi

    # Check liveness probe
    if ! check_endpoint "$LIVE_ENDPOINT" "Liveness Probe"; then
        failures=$((failures + 1))
    fi

    # Check readiness probe
    if ! check_endpoint "$READY_ENDPOINT" "Readiness Probe"; then
        failures=$((failures + 1))
    fi

    # Check detailed health
    if ! check_app_health; then
        local health_result=$?
        failures=$((failures + health_result))
    fi

    # Check system resources
    check_system_resources

    # Determine overall status
    if [ $failures -eq 0 ]; then
        log_message "✅ All checks passed"

        # Check if we need to send recovery notification
        if [ -f "${ALERT_FILE}_recovery_needed" ]; then
            send_recovery_notification
            rm -f "${ALERT_FILE}_recovery_needed"
        fi
    elif [ $failures -le 2 ]; then
        log_message "⚠️ Some issues detected ($failures failures)"
    else
        log_message "🚨 Multiple failures detected ($failures failures)"

        # Mark that we need to send recovery notification when fixed
        touch "${ALERT_FILE}_recovery_needed"

        send_alert "🚨 IntakeAI Health: Multiple Service Failures" \
            "Multiple health checks are failing!\n\nFailures: $failures\nTime: $(date)\n\nPlease investigate immediately."
    fi

    log_message "🏁 Health check completed\n"
}

# Run the monitoring
main "$@"