import { Hono } from 'hono'
import { conversationId, requireOwner, requireUser } from './auth.ts'
import type { AuthVariables, Verify } from './auth.ts'

/**
 * The agent's HTTP surface. Only /health is open: a new conversation needs
 * a Privy token, and every conversation route needs the token of the user
 * whose hash starts the id.
 */
export function routes(verify: () => Verify, agent: Hono) {
  const app = new Hono<{ Variables: AuthVariables }>()
  const user = requireUser(verify)

  app.get('/health', (c) => c.text('ok'))

  app.post('/conversations', user, (c) =>
    c.json({ id: conversationId(c.get('userHash')) }, 201),
  )

  app.use('/agents/lana/:id', user, requireOwner)
  app.use('/agents/lana/:id/*', user, requireOwner)
  app.route('/agents/lana', agent)

  return app
}
