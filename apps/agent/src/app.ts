import { createAgentRouter } from '@flue/runtime/routing'
import { Hono } from 'hono'
import { Lana } from './agents/lana.ts'

const app = new Hono()

app.get('/health', (c) => c.text('ok'))
app.route('/agents/lana', createAgentRouter(Lana))

export default app
