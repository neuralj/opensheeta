<template>
  <div class="session-chat">
    <el-page-header @back="$router.push('/sessions')" title="Back to Sessions">
      <template #content>
        <span class="session-title">{{ sessionTitle }}</span>
        <el-tag v-if="turnActive" type="primary" effect="light" round class="turn-indicator">
          <el-icon class="spinning"><Loading /></el-icon>
          Thinking...
        </el-tag>
      </template>
      <template #extra>
        <el-button v-if="turnActive" type="danger" @click="handleInterrupt">Interrupt</el-button>
      </template>
    </el-page-header>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0 && !loading" class="empty-chat">
        <el-icon :size="48"><ChatDotRound /></el-icon>
        <p>Start a conversation</p>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="message-row" :class="`message-row--${msg.role}`">
        <div class="message-bubble" :class="`bubble--${msg.role}`">
          <div v-if="msg.reasoning" class="reasoning-block">
            <el-collapse>
              <el-collapse-item title="Reasoning process">
                <pre class="reasoning-text">{{ msg.reasoning }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-if="msg.text" class="message-text" v-html="renderMarkdown(msg.text)"></div>

          <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="tool-calls">
            <ToolCallCard v-for="(tc, i) in msg.toolCalls" :key="i" :tool-call="tc" />
          </div>

          <div class="message-time">
            {{ new Date(msg.timestamp).toLocaleTimeString() }}
          </div>
        </div>
      </div>

      <div v-if="streamingText !== '' || streamingReasoning !== ''" class="message-row message-row--assistant">
        <div class="message-bubble bubble--assistant bubble--streaming">
          <div v-if="streamingReasoning" class="reasoning-block">
            <el-collapse>
              <el-collapse-item title="Reasoning process">
                <pre class="reasoning-text">{{ streamingReasoning }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>
          <div v-if="streamingText" class="message-text" v-html="renderMarkdown(streamingText)"></div>
          <div v-else class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pendingApproval" class="approval-bar">
      <ApprovalDialog
        :tool-name="pendingApproval.name"
        :tool-args="pendingApproval.args"
        :reason="pendingApproval.reason"
        @approve="handleApprove('once')"
        @deny="handleApprove('deny')"
      />
    </div>

    <div class="input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        placeholder="Type a message..."
        :disabled="sending"
        @keydown.ctrl.enter="handleSend"
        @keydown.meta.enter="handleSend"
      />
      <div class="input-actions">
        <span class="hint-text">Ctrl+Enter to send</span>
        <el-button type="primary" @click="handleSend" :loading="sending" :disabled="!inputText.trim()">
          Send
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue"
import { useRoute } from "vue-router"
import { ElMessage } from "element-plus"
import { useAPI } from "../composables/useAPI"
import { registerSessionHandler, unregisterSessionHandler } from "../composables/useWebSocket"
import { useInboxStore } from "../stores/inbox"
import type { ChatMessage, ToolCallInfo, Message } from "../types"
import ToolCallCard from "../components/ToolCallCard.vue"
import ApprovalDialog from "../components/ApprovalDialog.vue"

const route = useRoute()
const api = useAPI()
const inboxStore = useInboxStore()

const sessionId = computed(() => route.params.id as string)
const sessionTitle = ref("Session")
const messages = ref<ChatMessage[]>([])
const inputText = ref("")
const sending = ref(false)
const loading = ref(false)
const turnActive = ref(false)
const streamingText = ref("")
const streamingReasoning = ref("")
const messagesContainer = ref<HTMLElement | null>(null)
const pendingApproval = ref<{ name: string; args: Record<string, unknown>; reason: string } | null>(null)
const currentToolCalls = ref<Map<string, ToolCallInfo>>(new Map())

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const renderMarkdown = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>")
}

const handleEvent = (type: string, data: Record<string, unknown>) => {
  switch (type) {
    case "turn_start":
      turnActive.value = true
      streamingText.value = ""
      streamingReasoning.value = ""
      currentToolCalls.value.clear()
      break
    case "assistant_delta":
      streamingText.value += (data.text as string) ?? ""
      scrollToBottom()
      break
    case "reasoning_delta":
      streamingReasoning.value += (data.text as string) ?? ""
      break
    case "tool_proposed": {
      const name = data.name as string
      const tc: ToolCallInfo = {
        name,
        args: (data.arguments as Record<string, unknown>) ?? {},
        status: "proposed",
      }
      currentToolCalls.value.set(name + "_" + currentToolCalls.value.size, tc)
      scrollToBottom()
      break
    }
    case "permission_required":
      pendingApproval.value = {
        name: data.name as string,
        args: (data.arguments as Record<string, unknown>) ?? {},
        reason: (data.reason as string) ?? "",
      }
      break
    case "tool_started": {
      const toolName = data.name as string
      for (const [key, tc] of currentToolCalls.value) {
        if (tc.name === toolName && tc.status === "proposed") {
          tc.status = "running"
          break
        }
      }
      break
    }
    case "tool_finished": {
      const toolName = data.name as string
      for (const [key, tc] of currentToolCalls.value) {
        if (tc.name === toolName && tc.status === "running") {
          tc.status = (data.status as string) === "ok" ? "completed" : "failed"
          tc.result = data.result_preview as string
          break
        }
      }
      break
    }
    case "assistant_message":
    case "turn_end":
    case "turn_done": {
      if (streamingText.value || currentToolCalls.value.size > 0) {
        const msg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          text: streamingText.value,
          reasoning: streamingReasoning.value || undefined,
          toolCalls: currentToolCalls.value.size > 0 ? [...currentToolCalls.value.values()] : undefined,
          timestamp: Date.now(),
        }
        messages.value.push(msg)
      }
      streamingText.value = ""
      streamingReasoning.value = ""
      turnActive.value = false
      pendingApproval.value = null
      currentToolCalls.value.clear()
      scrollToBottom()
      break
    }
    case "error":
      ElMessage.error((data.error as string) ?? "An error occurred")
      turnActive.value = false
      break
  }
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text) return

  messages.value.push({
    id: `user_${Date.now()}`,
    role: "user",
    text,
    timestamp: Date.now(),
  })
  inputText.value = ""
  sending.value = true
  scrollToBottom()

  try {
    await api.sendMessage(sessionId.value, text)
  } catch {
    ElMessage.error("Failed to send message")
  } finally {
    sending.value = false
  }
}

const handleInterrupt = async () => {
  try {
    const ws = getWsForSession()
    if (ws) {
      ws.send(JSON.stringify({ type: "interrupt" }))
    }
    turnActive.value = false
  } catch {
    ElMessage.error("Failed to interrupt")
  }
}

const getWsForSession = (): WebSocket | null => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const port = window.location.port || "8765"
  const wsPort = parseInt(port) + 1
  const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/?session_id=${sessionId.value}`
  const ws = new WebSocket(wsUrl)
  return ws
}

const handleApprove = async (decision: string) => {
  try {
    await inboxStore.resolve(inboxStore.items[0]?.id ?? "", decision)
    pendingApproval.value = null
  } catch {
    ElMessage.error("Failed to respond to approval")
  }
}

const loadMessages = async () => {
  loading.value = true
  try {
    const [sessionRes, msgRes] = await Promise.all([
      api.getSession(sessionId.value),
      api.getMessages(sessionId.value),
    ])
    sessionTitle.value = sessionRes.data.title || sessionId.value.slice(0, 8)

    const chatMsgs: ChatMessage[] = []
    for (const msg of msgRes.data.messages) {
      const textParts = msg.parts.filter((p) => p.type === "text")
      const reasoningParts = msg.parts.filter((p) => p.type === "reasoning")
      const toolParts = msg.parts.filter((p) => p.type === "tool-invocation")

      const toolCalls: ToolCallInfo[] = toolParts.map((p) => {
        const ti = p.toolInvocation
        return {
          name: ti.toolName,
          args: (ti.args as Record<string, unknown>) ?? {},
          status: ti.state === "call" ? ("proposed" as const) : ("completed" as const),
          result: ti.state === "result" ? ti.result : undefined,
        }
      })

      chatMsgs.push({
        id: msg.id,
        role: msg.role,
        text: textParts.map((p) => p.text).join("\n"),
        reasoning: reasoningParts.map((p) => p.text).join("\n") || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        timestamp: msg.metadata.time.created,
      })
    }
    messages.value = chatMsgs
    scrollToBottom()
  } catch {
    ElMessage.error("Failed to load session")
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  registerSessionHandler(sessionId.value, handleEvent)
  loadMessages()
})

onUnmounted(() => {
  unregisterSessionHandler(sessionId.value)
})
</script>

<style scoped>
.session-chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 0;
}

.session-title {
  font-weight: 600;
  margin-left: 8px;
}

.turn-indicator {
  margin-left: 12px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  gap: 12px;
}

.message-row {
  display: flex;
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
}

.bubble--user {
  background: #409eff;
  color: white;
  border-bottom-right-radius: 4px;
}

.bubble--assistant {
  background: #f4f4f5;
  color: #303133;
  border-bottom-left-radius: 4px;
}

.bubble--streaming {
  border: 1px solid #e4e7ed;
  background: #fafafa;
}

.message-text {
  word-break: break-word;
}

.message-text :deep(.code-block) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  margin: 8px 0;
}

.message-text :deep(.inline-code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.message-time {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
  text-align: right;
}

.reasoning-block {
  margin-bottom: 8px;
}

.reasoning-block :deep(.el-collapse) {
  border: none;
}

.reasoning-block :deep(.el-collapse-item__header) {
  font-size: 12px;
  color: #909399;
  height: 28px;
  background: transparent;
  border: none;
}

.reasoning-text {
  font-size: 12px;
  color: #606266;
  white-space: pre-wrap;
  margin: 0;
}

.tool-calls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.approval-bar {
  padding: 0 20px;
}

.input-area {
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.hint-text {
  font-size: 12px;
  color: #909399;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
