import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderDocument, versionedDocumentPath } from '#openapi/document'

const MAX_DIFFERENCES = 40

/**
 * Recorre los dos documentos a la vez y devuelve una línea por cada ruta
 * (`paths./api/v1/tasks.get.responses.200`) que solo está en un lado o que
 * tiene un valor distinto.
 */
function describeDifferences(versioned: unknown, current: unknown, path = ''): string[] {
  const label = path || '(raíz)'

  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

  if (
    !isObject(versioned) ||
    !isObject(current) ||
    Array.isArray(versioned) !== Array.isArray(current)
  ) {
    return JSON.stringify(versioned) === JSON.stringify(current)
      ? []
      : [`~ ${label}: ${JSON.stringify(versioned)} -> ${JSON.stringify(current)}`]
  }

  const differences: string[] = []
  const keys = new Set([...Object.keys(versioned), ...Object.keys(current)])
  for (const key of keys) {
    const child = path ? `${path}.${key}` : key
    if (!(key in current)) differences.push(`- ${child}: está en el versionado y ya no se genera`)
    else if (!(key in versioned))
      differences.push(`+ ${child}: se genera pero no está en el versionado`)
    else differences.push(...describeDifferences(versioned[key], current[key], child))
  }
  return differences
}

export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que el documento versionado coincide con el del código, sin escribir nada'

  static options: CommandOptions = { startApp: true }

  async run() {
    // El documento regenerado se escribe en una carpeta temporal, nunca en el
    // fichero versionado, que aquí solo se lee.
    const dir = await mkdtemp(join(tmpdir(), 'openapi-check-'))
    try {
      const generatedPath = join(dir, 'openapi.json')
      await writeFile(generatedPath, await renderDocument(this.app), 'utf-8')

      const generated = await readFile(generatedPath, 'utf-8')
      // Con `core.autocrlf` Git extrae el fichero con CRLF en Windows: el fin de
      // línea es de la copia de trabajo, no del contrato, así que no cuenta.
      const versioned = await readFile(versionedDocumentPath, 'utf-8')
        .then((content) => content.replace(/\r\n/g, '\n'))
        .catch(() => null)

      if (versioned === null) {
        this.logger.error(
          `No existe ${versionedDocumentPath}. Ejecuta \`npm run openapi:generate\`.`
        )
        this.exitCode = 1
        return
      }

      if (versioned === generated) {
        this.logger.success('docs/api/openapi.json está al día con el código')
        return
      }

      this.logger.error('docs/api/openapi.json no coincide con el documento que genera el código')

      let differences: string[]
      try {
        differences = describeDifferences(JSON.parse(versioned), JSON.parse(generated))
      } catch {
        differences = ['El fichero versionado no es JSON válido']
      }

      if (differences.length === 0) {
        this.logger.info(
          'El contenido es el mismo y solo cambia el formato (sangrado o salto final)'
        )
      }
      for (const line of differences.slice(0, MAX_DIFFERENCES)) this.logger.info(line)
      if (differences.length > MAX_DIFFERENCES) {
        this.logger.info(`… y ${differences.length - MAX_DIFFERENCES} diferencias más`)
      }

      this.logger.info('Para ponerlo al día: `npm run openapi:generate` y commitea el resultado')
      this.exitCode = 1
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
}
