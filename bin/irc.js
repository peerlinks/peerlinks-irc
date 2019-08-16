#!/usr/bin/env node
import Server from '../';

const server = new Server();

server.open().then(() => {
  server.listen(1337, () => {
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

