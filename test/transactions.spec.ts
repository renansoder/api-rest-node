import { expect, beforeAll, afterAll, describe, it, beforeEach } from 'vitest'
import supertest from 'supertest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('Criar uma nova transação', async () => {
    const response = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 300,
      type: 'credit'
    })

    expect(response.statusCode).toEqual(201)
  })

  it('Listar transactions', async () => {
    const createTransaction = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 300,
      type: 'credit'
    })

    const cookie = createTransaction.get('Set-Cookie')
    const listTransactions = await supertest(app.server).get('/transactions').set('Cookie', cookie).expect(200)

    expect(listTransactions.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 300
      })
    ])
  })

  it('Listar transaction por ID', async () => {
    const createTransaction = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 300,
      type: 'credit'
    })

    const cookie = createTransaction.get('Set-Cookie')
    const listTransactions = await supertest(app.server).get('/transactions').set('Cookie', cookie).expect(200)

    const transactionId = listTransactions.body.transactions[0].id
    const getTransaction = await supertest(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookie)
      .expect(200)

    expect(getTransaction.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 300
      })
    )
  })

  it('Listar resumo de transactions', async () => {
    const createTransaction = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    })

    const cookie = createTransaction.get('Set-Cookie')

    await supertest(app.server)
      .post('/transactions')
      .set('Cookie', cookie)
      .send({
        title: 'Debit transaction',
        amount: 2000,
        type: 'debit'
      })
      .expect(201)

    const summary = await supertest(app.server).get('/transactions/summary').set('Cookie', cookie).expect(200)

    expect(summary.body.summary).toEqual({
      amount: 3000
    })
  })
})
