import * as net from 'net';
import * as path from 'path';

import hyperswarm from 'hyperswarm';
import createDebug from 'debug';

import VowLink, { StreamSocket } from '@vowlink/protocol';
import Storage from '@vowlink/sqlite-storage';

import IRCPeer from './irc/peer';

const debug = createDebug('vowlink-irc:server');

export default class Server extends net.Server {
  constructor(options = {}) {
    super((socket) => {
      this.onIRCConnection(socket);
    });

    this.options = Object.assign({}, options);
    this.swarm = hyperswarm(options.hyperswarm);

    this.storage = null;
    this.vowlink = null;

    this.swarm.on('connection', (socket, info) => {
      this.onP2PConnection(socket, info);
    });
  }

  async open() {
    const file = this.options.db || 'db.sqlite';
    const storage = new Storage({ file });

    await storage.open();

    this.storage = storage;
    this.vowlink = new VowLink({ storage });

    await this.vowlink.load();

    for (const channel of this.vowlink.channels) {
      this.swarm.join(channel.id, { lookup: true, announce: true });
    }
  }

  close(callback = () => {}) {
    if (!this.vowlink) {
      return callback(new Error('Already closing'));;
    }

    Promise.all([
      this.vowlink.close(),
      new Promise((resolve) => super.close(resolve)),
    ]).then(() => {
      callback(null);
    }).catch((err) => {
      callback(err);
    });
    this.vowlink = null;
  }

  onIRCConnection(socket) {
    const peer = new IRCPeer({
      socket,
      vowlink: this.vowlink,
      swarmJoin: (id) => {
        this.swarm.join(id, { lookup: true, announce: true });
      },
    });

    socket.on('close', () => {
      peer.close();
    });

    peer.loop().catch((e) => {
      debug('destroying socket due to error %s', e.stack);
      try {
        socket.write('ERROR :' + e.message + '\r\n');
      } catch (_) {
      }
      socket.destroy();
    });
  }

  onP2PConnection(stream, info) {
    const socket = new StreamSocket(stream);

    this.vowlink.connect(socket).then((reconnect) => {
      if (!reconnect) {
        info.reconnect(false);
      }
    }).catch((e) => {
      console.error(e.stack);
    });
  }
}
