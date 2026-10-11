import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { conversationId, requireOwner, requireUser } from './auth.ts'
import { parseExpiry } from './tokens.ts'
import type { AuthVariables, Verify } from './auth.ts'
import type { TokenStore } from './tokens.ts'

/** The app's LanaTools access token, and the seconds it has left. */
export const TOKEN_HEADER = 'x-lanatools-token'
export const EXPIRES_HEADER = 'x-lanatools-token-expires-in'

/**
 * The agent's HTTP surface. Only /health is open: a new conversation needs
 * a Privy token, and every conversation route needs the token of the user
 * whose hash starts the id.
 */
export function routes(
  verify: () => Verify,
  tokens: () => TokenStore,
  agent: Hono,
) {
  const app = new Hono<{ Variables: AuthVariables }>()
  const user = requireUser(verify)

  // A request that starts work hands over the user's LanaTools access
  // token; the agent's MCP connection reads it back. Reads and reconnects
  // carry it too, but only a POST stores it.
  const saveToken = createMiddleware<{ Variables: AuthVariables }>(
    async (c, next) => {
      const token = c.req.header(TOKEN_HEADER)
      const expiresAt = parseExpiry(c.req.header(EXPIRES_HEADER))
      if (c.req.method === 'POST' && token && expiresAt)
        // Storing it is best effort: a misconfigured key or a D1 hiccup
        // costs this turn its tools, never the message itself.
        try {
          await tokens().save(c.get('userHash'), token, expiresAt)
        } catch (error) {
          console.error('Could not store the LanaTools token', error)
        }
      await next()
    },
  )

  app.get('/health', (c) => c.text('ok'))

  app.post('/conversations', user, saveToken, (c) =>
    c.json({ id: conversationId(c.get('userHash')) }, 201),
  )

  // Disconnecting LanaTools in the app forgets the token here too.
  app.delete('/lanatools/token', user, async (c) => {
    await tokens().remove(c.get('userHash'))
    return c.body(null, 204)
  })

  app.use('/agents/lana/:id', user, requireOwner, saveToken)
  app.use('/agents/lana/:id/*', user, requireOwner, saveToken)
  app.route('/agents/lana', agent)

  return app
}
