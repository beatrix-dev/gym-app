export interface AppConfig {
  authority: string
  clientId: string
  cognitoDomain: string
  apiBaseUrl: string
}

let config: AppConfig | null = null

export async function loadConfig(): Promise<AppConfig> {
  if (config) return config
  const response = await fetch('/config.json')
  if (!response.ok) {
    throw new Error(`Failed to load /config.json (${response.status})`)
  }
  config = (await response.json()) as AppConfig
  return config
}

export function getConfig(): AppConfig {
  if (!config) throw new Error('Config not loaded: call loadConfig() first')
  return config
}

export function setConfigForTests(c: AppConfig): void {
  config = c
}
