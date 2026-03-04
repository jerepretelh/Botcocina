import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRecipesRequest } from './shared'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleRecipesRequest(req, res)
}
