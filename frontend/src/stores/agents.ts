import { defineStore } from "pinia"
import { ref } from "vue"
import type { AgentInfo, PersonaManifest } from "../types"
import { useAPI } from "../composables/useAPI"

export const useAgentsStore = defineStore("agents", () => {
  const agents = ref<AgentInfo[]>([])
  const personas = ref<PersonaManifest[]>([])
  const loading = ref(false)

  const api = useAPI()

  const fetchAgents = async () => {
    loading.value = true
    try {
      const [agentsRes, personasRes] = await Promise.all([
        api.getAgents(),
        api.getPersonas(),
      ])
      agents.value = agentsRes.data.agents
      personas.value = personasRes.data.personas
    } finally {
      loading.value = false
    }
  }

  return { agents, personas, loading, fetchAgents }
})
