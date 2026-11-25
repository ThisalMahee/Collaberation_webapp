export interface Config {
  databaseUrl: string
  portHocuspocus: number
  portApi: number
}

const DEFAULT_PORT_HOCUSPOCUS = 1234
const DEFAULT_PORT_API = 3001

/** Read runtime configuration from the environment, with sensible port defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  return {
    databaseUrl,
    portHocuspocus: toPort(env.PORT_HOCUSPOCUS, DEFAULT_PORT_HOCUSPOCUS),
    portApi: toPort(env.PORT_API, DEFAULT_PORT_API),
  }
}

function toPort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback
  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${raw}`)
  }
  return port
}
