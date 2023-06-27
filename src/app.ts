import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { transactionsRoutes } from './routes/transactions'

export const app = fastify()

// para criar o sessão
app.register(cookie)

// a ordem dos plugins importa
app.register(transactionsRoutes, {
  prefix: 'transactions'
})
