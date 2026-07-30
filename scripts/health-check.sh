#!/bin/bash
# Opensheeta 健康检查脚本
# 用法: scripts/health-check.sh

set -e

DAEMON_URL="${OS_HEALTH_URL:-http://localhost:8765}"
DASHBOARD_URL="${DASHBOARD_HEALTH_URL:-http://localhost:3000}"

echo "Opensheeta Health Check"
echo "======================="
echo ""

# 检查 daemon
echo "Checking daemon..."
DAEMON_HEALTH=$(curl -s -f "$DAEMON_URL/health" 2>/dev/null || echo "FAILED")

if [[ $DAEMON_HEALTH == *"ok"* ]]; then
    echo "✓ Daemon is healthy"
    echo "  Status: $(echo $DAEMON_HEALTH | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    echo "  Mode: $(echo $DAEMON_HEALTH | grep -o '"mode":"[^"]*"' | cut -d'"' -f4)"
    echo "  OpenCode: $(echo $DAEMON_HEALTH | grep -o '"opencode":"[^"]*"' | cut -d'"' -f4)"
else
    echo "✗ Daemon is unhealthy or not responding"
    echo "  URL: $DAEMON_URL/health"
    echo "  Response: $DAEMON_HEALTH"
fi

echo ""

# 检查 dashboard
echo "Checking dashboard..."
DASHBOARD_HEALTH=$(curl -s -f "$DASHBOARD_URL/api/health" 2>/dev/null || echo "FAILED")

if [[ $DASHBOARD_HEALTH == *"score"* ]]; then
    echo "✓ Dashboard is healthy"
    SCORE=$(echo $DASHBOARD_HEALTH | grep -o '"score":[0-9]*' | cut -d':' -f2)
    echo "  Health score: $SCORE/100"
else
    echo "✗ Dashboard is unhealthy or not responding"
    echo "  URL: $DASHBOARD_URL/api/health"
    echo "  Response: $DASHBOARD_HEALTH"
fi

echo ""

# 检查服务状态
echo "Service status:"
scripts/services status 2>/dev/null || echo "  (service management not available)"

echo ""
echo "Health check completed at $(date)"
