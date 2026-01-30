import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// For CLI tools (seed, migrate), load .env.local if not already loaded
if (!process.env.TURSO_DATABASE_URL && typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: '.env.local' });
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
