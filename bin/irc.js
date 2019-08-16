#!/usr/bin/env node
import Server from '../';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 1337;
const db = process.env.DB || 'db.sqlite';

const server = new Server({
  db,
});

server.open().then(() => {
  server.listen(port, () => {
    console.error('Listening on %j', server.address());
  });

  process.on('SIGINT', () => {
    console.log('Closing...');
    server.close();
  });
}).catch((e) => {
  console.error(e.stack);
  process.exit(1);
});

