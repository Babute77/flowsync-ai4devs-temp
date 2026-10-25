import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { renderDocument, versionedDocumentPath } from '#openapi/document'

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Escribe el documento OpenAPI en docs/api/openapi.json'

  static options: CommandOptions = { startApp: true }

  async run() {
    const content = await renderDocument(this.app)

    await mkdir(dirname(versionedDocumentPath), { recursive: true })
    await writeFile(versionedDocumentPath, content, 'utf-8')

    this.logger.success(`Documento OpenAPI escrito en ${versionedDocumentPath}`)
  }
}
