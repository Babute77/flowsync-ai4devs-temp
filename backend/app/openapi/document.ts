import type { ApplicationService } from '@adonisjs/core/types'
import { fileURLToPath } from 'node:url'

/**
 * El documento versionado vive en `docs/` de la raíz del monorepo, no dentro
 * de `backend/`: es contrato para quien consume la API, no código del servidor.
 */
export const VERSIONED_DOCUMENT_URL = new URL('../../../docs/api/openapi.json', import.meta.url)

export const versionedDocumentPath = fileURLToPath(VERSIONED_DOCUMENT_URL)

/**
 * Construye el documento con el mismo `buildDocument()` que sirve `/api.json`
 * y lo serializa de forma estable: sangrado de dos espacios, LF y salto final.
 * Las rutas ya están registradas porque `start/routes.ts` es un preload.
 */
export async function renderDocument(app: ApplicationService): Promise<string> {
  const router = await app.container.make('router')
  router.commit()

  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()
  return JSON.stringify(document, null, 2) + '\n'
}
