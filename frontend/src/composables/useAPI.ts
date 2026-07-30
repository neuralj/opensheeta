import axios from "axios"
import type {
  TaskRecord, PipelineRecord, PipelineStage, RecurringRecord,
  Session, Message, InboxItem, PersonaManifest, ScheduledTask,
  AutomationRun, AgentInfo, HealthStatus,
} from "../types"

const api = axios.create({
  baseURL: "",
  timeout: 30000,
})

export interface TaskChainInfo {
  task: TaskRecord
  parent: TaskRecord | null
  children: TaskRecord[]
}

export const useAPI = () => {
  return {
    getHealth: () => api.get<HealthStatus>("/health"),

    getTasks: (status?: string) =>
      api.get<{ tasks: TaskRecord[] }>("/v1/tasks", { params: { status } }),
    getTask: (id: string) => api.get<TaskRecord>(`/v1/tasks/${id}`),
    createTask: (data: {
      prompt: string
      directory?: string
      model?: string
      on_success?: string
      on_failure?: string
      max_chain_depth?: number
    }) => api.post<TaskRecord>("/v1/tasks", data),
    abortTask: (id: string) => api.post(`/v1/tasks/${id}/abort`),
    retryTask: (id: string) => api.post(`/v1/tasks/${id}/retry`),
    getTaskChain: (id: string) => api.get<TaskChainInfo>(`/v1/tasks/${id}/chain`),

    controlQueue: (action: "pause" | "resume") =>
      api.post<{ paused: boolean }>("/v1/queue", { action }),

    getPipelines: () =>
      api.get<{ pipelines: (PipelineRecord & { stages: PipelineStage[] })[] }>("/v1/pipelines"),
    getPipeline: (id: string) =>
      api.get<PipelineRecord & { stages: PipelineStage[] }>(`/v1/pipelines/${id}`),
    createPipeline: (data: {
      name?: string
      directory?: string
      stages: { prompt: string; model?: string; label?: string }[]
    }) => api.post<PipelineRecord>("/v1/pipelines", data),
    abortPipeline: (id: string) => api.post(`/v1/pipelines/${id}/abort`),
    deletePipeline: (id: string) => api.delete(`/v1/pipelines/${id}`),

    getRecurring: () => api.get<{ recurring: RecurringRecord[] }>("/v1/recurring"),
    createRecurring: (data: {
      name: string
      directory?: string
      prompt: string
      cron: string
      model?: string
      timezone?: string
      enabled?: boolean
    }) => api.post<RecurringRecord>("/v1/recurring", data),
    updateRecurring: (id: string, data: Partial<RecurringRecord>) =>
      api.put<RecurringRecord>(`/v1/recurring/${id}`, data),
    deleteRecurring: (id: string) => api.delete(`/v1/recurring/${id}`),

    getAgents: () => api.get<{ agents: AgentInfo[] }>("/v1/agents"),

    getSessions: () => api.get<{ sessions: Session[] }>("/v1/sessions"),
    createSession: (data?: { title?: string }) =>
      api.post<Session>("/v1/sessions", data ?? {}),
    getSession: (id: string) => api.get<Session>(`/v1/sessions/${id}`),
    deleteSession: (id: string) => api.delete(`/v1/sessions/${id}`),
    sendMessage: (id: string, text: string) =>
      api.post<Message>(`/v1/sessions/${id}/messages`, { text }),
    getMessages: (id: string) =>
      api.get<{ messages: Message[] }>(`/v1/sessions/${id}/messages`),

    getInbox: (sessionId?: string) =>
      api.get<{ items: InboxItem[] }>("/v1/inbox", { params: sessionId ? { session_id: sessionId } : {} }),
    getInboxItem: (id: string) => api.get<{ item: InboxItem }>(`/v1/inbox/${id}`),
    resolveInbox: (id: string, resolution: string) =>
      api.post(`/v1/inbox/${id}/resolve`, { resolution }),

    getPersonas: () => api.get<{ personas: PersonaManifest[] }>("/v1/personas"),
    getPersona: (id: string) => api.get<PersonaManifest>(`/v1/personas/${id}`),

    getAutomations: () => api.get<{ automations: ScheduledTask[] }>("/v1/automations"),
    createAutomation: (data: {
      title: string
      instructions: string
      cron: string
      timezone?: string
      workspace?: string
      agent?: string
    }) => api.post<ScheduledTask>("/v1/automations", data),
    updateAutomation: (id: string, data: Partial<ScheduledTask>) =>
      api.put<ScheduledTask>(`/v1/automations/${id}`, data),
    deleteAutomation: (id: string) => api.delete(`/v1/automations/${id}`),
    getAutomationRuns: (id: string) =>
      api.get<{ runs: AutomationRun[] }>(`/v1/automations/${id}/runs`),

    setUnattended: (sessionId: string, unattended: boolean) =>
      api.post(`/v1/sessions/${sessionId}/unattended`, { unattended }),
    getUnattended: (sessionId: string) =>
      api.get<{ unattended: boolean }>(`/v1/sessions/${sessionId}/unattended`),
  }
}
