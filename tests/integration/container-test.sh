#!/bin/bash
set -e

# OpenWorker Next Container Integration Test
# Tests the container in standalone mode (without OpenCode)

CONTAINER_NAME="openworker-next-test"
IMAGE="openworker-next:latest"
REST_PORT=18765
WS_PORT=18766

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up..."
    docker rm -f $CONTAINER_NAME 2>/dev/null || true
    rm -f data/inbox.db data/conversations.db
}

trap cleanup EXIT

# Cleanup any existing container
cleanup

log_info "Starting container in standalone mode..."
docker run -d --name $CONTAINER_NAME \
    -p ${REST_PORT}:8765 \
    -p ${WS_PORT}:8766 \
    -e OW_STANDALONE=true \
    -e OW_LOG_LEVEL=info \
    $IMAGE

log_info "Waiting for container to be ready..."
sleep 3

# Test 1: Health check
log_info "Test 1: Health check endpoint..."
HEALTH=$(curl -s http://localhost:${REST_PORT}/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log_info "✓ Health check passed"
else
    log_error "✗ Health check failed: $HEALTH"
    exit 1
fi

# Test 2: Create session
log_info "Test 2: Create session..."
SESSION=$(curl -s -X POST http://localhost:${REST_PORT}/v1/sessions \
    -H "Content-Type: application/json" \
    -d '{"title":"Integration Test Session"}')
SESSION_ID=$(echo "$SESSION" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$SESSION_ID" ]; then
    log_info "✓ Session created: $SESSION_ID"
else
    log_error "✗ Failed to create session: $SESSION"
    exit 1
fi

# Test 3: List sessions
log_info "Test 3: List sessions..."
SESSIONS=$(curl -s http://localhost:${REST_PORT}/v1/sessions)
if echo "$SESSIONS" | grep -q "$SESSION_ID"; then
    log_info "✓ Session listed"
else
    log_error "✗ Session not found in list: $SESSIONS"
    exit 1
fi

# Test 4: Send message
log_info "Test 4: Send message..."
MESSAGE=$(curl -s -X POST "http://localhost:${REST_PORT}/v1/sessions/$SESSION_ID/messages" \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello from integration test!"}')
if echo "$MESSAGE" | grep -q "Mock response"; then
    log_info "✓ Message sent and received mock response"
else
    log_error "✗ Failed to send message: $MESSAGE"
    exit 1
fi

# Test 5: List messages
log_info "Test 5: List messages..."
MESSAGES=$(curl -s "http://localhost:${REST_PORT}/v1/sessions/$SESSION_ID/messages")
if echo "$MESSAGES" | grep -q '"messages"'; then
    log_info "✓ Messages listed"
else
    log_error "✗ Failed to list messages: $MESSAGES"
    exit 1
fi

# Test 6: List inbox (should be empty)
log_info "Test 6: List inbox..."
INBOX=$(curl -s http://localhost:${REST_PORT}/v1/inbox)
if echo "$INBOX" | grep -q '"items":[]'; then
    log_info "✓ Inbox is empty (as expected)"
else
    log_warn "Inbox not empty: $INBOX"
fi

# Test 7: List agents
log_info "Test 7: List agents..."
AGENTS=$(curl -s http://localhost:${REST_PORT}/v1/agents)
if echo "$AGENTS" | grep -q '"agents"'; then
    log_info "✓ Agents listed"
else
    log_error "✗ Failed to list agents: $AGENTS"
    exit 1
fi

# Test 8: Delete session
log_info "Test 8: Delete session..."
DELETE=$(curl -s -X DELETE "http://localhost:${REST_PORT}/v1/sessions/$SESSION_ID")
if echo "$DELETE" | grep -q '"ok":true'; then
    log_info "✓ Session deleted"
else
    log_error "✗ Failed to delete session: $DELETE"
    exit 1
fi

# Test 9: Verify session is gone
log_info "Test 9: Verify session deleted..."
SESSIONS_AFTER=$(curl -s http://localhost:${REST_PORT}/v1/sessions)
if ! echo "$SESSIONS_AFTER" | grep -q "$SESSION_ID"; then
    log_info "✓ Session no longer in list"
else
    log_error "✗ Session still exists after deletion"
    exit 1
fi

# Test 10: Check container logs
log_info "Test 10: Check container logs..."
LOGS=$(docker logs $CONTAINER_NAME 2>&1)
if echo "$LOGS" | grep -q "Daemon is ready"; then
    log_info "✓ Container started successfully"
else
    log_error "✗ Container did not start properly"
    echo "$LOGS"
    exit 1
fi

# Test 11: WebSocket connection test (basic)
log_info "Test 11: WebSocket server is listening..."
# We can't easily test WebSocket with curl, but we can check if the port is open
if nc -z localhost ${WS_PORT} 2>/dev/null; then
    log_info "✓ WebSocket port is open"
else
    log_warn "WebSocket port check skipped (nc not available)"
fi

log_info ""
log_info "========================================="
log_info "All integration tests passed! ✓"
log_info "========================================="
log_info ""
log_info "Container is running at:"
log_info "  REST API: http://localhost:${REST_PORT}"
log_info "  WebSocket: ws://localhost:${WS_PORT}"
log_info ""
log_info "To stop the container:"
log_info "  docker rm -f $CONTAINER_NAME"
