import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExist } from '../middlewares/check-session-id-exist'

export async function transactionsRoutes(app: FastifyInstance) {
  // Com esse hook pode fazer global para esse plugin de transactions, ou seja, para todas as rotas deste plugin;
  // se colocar no server.js ele pode ser para todas as rotas;
  // app.addHook('preHandler', async (req, reply) => {})

  app.get('/', { preHandler: [checkSessionIdExist] }, async (req) => {
    const { sessionId } = req.cookies
    const transactions = await knex('transactions').where('session_id', sessionId).select()
    return { transactions }
  })

  app.get('/:id', { preHandler: [checkSessionIdExist] }, async (req) => {
    const getTransactionParamsSchema = z.object({
      id: z.string().uuid()
    })
    const { id } = getTransactionParamsSchema.parse(req.params)
    const { sessionId } = req.cookies
    const transaction = await knex('transactions').where({ id, session_id: sessionId }).first()

    return { transaction }
  })

  app.get('/summary', { preHandler: [checkSessionIdExist] }, async (req) => {
    const { sessionId } = req.cookies
    const summary = await knex('transactions').where('session_id', sessionId).sum('amount', { as: 'amount' }).first()
    return { summary }
  })

  app.post('/', async (req, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    const { title, amount, type } = createTransactionBodySchema.parse(req.body)

    let sessionId = req.cookies.sessionId
    if (!sessionId) {
      sessionId = randomUUID()
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return reply.status(201).send()
  })
}
