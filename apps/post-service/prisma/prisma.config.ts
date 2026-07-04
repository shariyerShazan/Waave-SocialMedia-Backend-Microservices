import 'dotenv/config';
import path from 'path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.resolve(__dirname, './schema.prisma'),
  migrations: {
    path: path.resolve(__dirname, './migrations'),
  },
  datasource: {
    url: process.env.POST_DB_PRIMARY_URL!,
  },
});
