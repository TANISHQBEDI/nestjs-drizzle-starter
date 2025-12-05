export default () => ({
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT!) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT!),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
    url: process.env.DATABASE_URL,
  },
});
