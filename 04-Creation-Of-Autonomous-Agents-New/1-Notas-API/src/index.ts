import { createTaskHttpServer } from './http/server.js';

const port = Number(process.env.PORT ?? 3000);
const server = createTaskHttpServer();

server.listen(port, () => {
  console.log(`Task API listening on http://localhost:${port}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
