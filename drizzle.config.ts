import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local for Next.js compatibility
config({ path: '.env.local' });

const url = process.env.TURSO_DATABASE_URL!;
const isFileUrl = url?.startsWith('file:');
const isLocalHttp = url?.startsWith('http://127.0.0.1') || url?.startsWith('http://localhost');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: isFileUrl ? 'sqlite' : 'turso',
  dbCredentials: isFileUrl
    ? { url }
    : { url, authToken: process.env.TURSO_AUTH_TOKEN || (isLocalHttp ? '' : undefined) },
});
