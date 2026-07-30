#!/bin/bash
# Opensheeta 告警脚本
# 用法: scripts/alert.sh
# 建议添加到 crontab: */5 * * * * /opt/opensheeta/scripts/alert.sh

set -e

DAEMON_URL="${OS_HEALTH_URL:-http://localhost:8765}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
ALERT_LOG="/var/log/opensheeta/alerts.log"

log_alert() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> "$ALERT_LOG"
}

send_alert() {
    local subject="$1"
    local body="$2"
    
    # 记录日志
    log_alert "ALERT: $subject"
    
    # 发送邮件 (如果配置了邮件)
    if command -v mail &> /dev/null; then
        echo "$body" | mail -s "Opensheeta Alert: $subject" "$ALERT_EMAIL"
    fi
    
    # 发送 Slack 通知 (如果配置了 webhook)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Opensheeta Alert: $subject\n$body\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# 检查 daemon 健康状态
DAEMON_HEALTH=$(curl -s -f "$DAEMON_URL/health" 2>/dev/null || echo "FAILED")

if [[ $DAEMON_HEALTH != *"ok"* ]]; then
    send_alert "Daemon Unhealthy" "Opensheeta daemon is not responding at $DAEMON_URL/health"
    exit 1
fi

# 检查 OpenCode 连接状态
if [[ $DAEMON_HEALTH == *"disconnected"* ]]; then
    send_alert "OpenCode Disconnected" "OpenCode is not connected to the daemon"
fi

# 检查服务状态
if command -v launchctl &> /dev/null; then
    # macOS
    if ! launchctl list | grep -q "com.neuralj.opensheeta"; then
        send_alert "Service Not Running" "Opensheeta daemon service is not loaded"
    fi
elif command -v systemctl &> /dev/null; then
    # Linux
    if ! systemctl is-active --quiet opensheeta; then
        send_alert "Service Not Running" "Opensheeta daemon service is not active"
    fi
fi

# 检查磁盘空间
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    send_alert "Disk Space Low" "Disk usage is at ${DISK_USAGE}%"
fi

# 检查日志文件大小
LOG_DIR="/opt/opensheeta/logs"
if [ -d "$LOG_DIR" ]; then
    for log in "$LOG_DIR"/*.log; do
        if [ -f "$log" ]; then
            SIZE=$(du -m "$log" | cut -f1)
            if [ "$SIZE" -gt 100 ]; then
                send_alert "Log File Large" "Log file $log is ${SIZE}MB"
            fi
        fi
    done
fi

# 检查内存使用
if command -v ps &> /dev/null; then
    MEM_USAGE=$(ps aux | grep "[n]ode.*daemon.js" | awk '{print $4}' | head -1)
    if [ -n "$MEM_USAGE" ] && (( $(echo "$MEM_USAGE > 80" | bc -l 2>/dev/null || echo 0) )); then
        send_alert "High Memory Usage" "Daemon is using ${MEM_USAGE}% of memory"
    fi
fi

echo "Health check completed at $(date)" >> "$ALERT_LOG"
