import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: responsable identificable, la tarea no filtra
 * datos de cuenta y responsable sin nombre.
 */
/** Día de quien mira: la consulta de una tarea suelta lo exige. */
const HOY = '2026-10-16'

test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function sesion(client: any, fullName: string | null, email = 'ada@example.com') {
    await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function crearTarea(client: any, token: string, title = 'Revisar el informe') {
    const response = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title })

    response.assertStatus(201)

    return response.body().data.id as number
  }

  test('el responsable trae su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client, 'Ada Lovelace')
    const id = await crearTarea(client, token)

    const response = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.equal(response.body().data.assignee.fullName, 'Ada Lovelace')
    assert.equal(response.body().data.assignee.initials, 'AL')
  })

  test('una tarea suelta no filtra el email ni otros datos de la cuenta', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, 'Ada Lovelace')
    const id = await crearTarea(client, token)

    const response = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.notProperty(response.body().data.assignee, 'email')
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')
  })

  test('las tareas de la lista no filtran el email ni otros datos de la cuenta', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, 'Ada Lovelace')
    await crearTarea(client, token)

    const response = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const tareas = response.body().data
    assert.isAbove(tareas.length, 0)
    for (const tarea of tareas) {
      assert.notProperty(tarea.assignee, 'email')
    }
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')
  })

  test('un responsable sin nombre llega con nombre nulo e iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, null)
    const id = await crearTarea(client, token)

    const response = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isNull(response.body().data.assignee.fullName)
    assert.equal(response.body().data.assignee.initials, 'AE')
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')
  })
})
