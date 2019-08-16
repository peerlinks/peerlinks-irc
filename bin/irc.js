#!/usr/bin/env node
import Server from '../';

const server = new Server();

server.load().then(() => {
  server.listen(1337, () => {
    console.error('Listening on %j', server.address());
  });
}).catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
