import * as net from 'net';
import * as path from 'path';
import hyperswarm from 'hyperswarm';
import createDebug from 'debug';

import Protocol from '@vowlink/protocol';
import Storage from '@vowlink/sqlite-storage';

import IRCPeer from './irc/peer';

const debug = createDebug('vowlink-irc:server');

export default class Server extends net.Server {
  constructor(options = {}) {
    super((socket) => {
      this.onConnection(socket);
    });

    this.options = Object.assign({}, options);

    this.protocol = null;
  }

  async load() {
    const file = this.options.db || 'db.sqlite';
    const storage = new Storage({ file });

    await storage.open();

    this.protocol = new Protocol({ storage });
  }

  onConnection(socket) {
    const peer = new IRCPeer(socket);

    peer.loop().catch((e) => {
      debug('destroying socket due to error %s', e.stack);
      try {
        socket.write('ERROR :' + e.message + '\r\n');
      } catch (_) {
      }
      socket.destroy();
    });
  }
}
