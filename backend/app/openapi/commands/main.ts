import type { BaseCommand } from '@adonisjs/core/ace'
import OpenapiCheck from './openapi_check.js'
import OpenapiGenerate from './openapi_generate.js'

/**
 * Paquete de comandos que `adonisrc.ts` registra con `commands: [...]`.
 *
 * No viven en `commands/` a propósito: ace valida los metadatos de esa
 * carpeta con `jsonschema`, que desde Node 24.21 lanza `Invalid URL` y deja
 * sin arrancar cualquier comando propio. Los paquetes registrados por
 * `adonisrc.ts` no pasan por esa validación.
 */
const commands: (typeof BaseCommand)[] = [OpenapiGenerate, OpenapiCheck]

export async function getMetaData() {
  return commands.map((command) => command.serialize())
}

export async function getCommand(metaData: { commandName: string }) {
  return commands.find((command) => command.commandName === metaData.commandName) ?? null
}
