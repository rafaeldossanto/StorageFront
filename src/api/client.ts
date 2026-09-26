import createClient from 'openapi-fetch'
import type { paths } from './schema'

/**
 * Typed client for the Storage API.
 *
 * `schema.d.ts` is generated from the contract the backend writes on every build
 * (Storage/openapi/storage-api.json) - run `npm run api:types` after the API changes. A
 * route or field that no longer exists then fails to compile here instead of failing in
 * front of the shopkeeper.
 */
export const api = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL })
