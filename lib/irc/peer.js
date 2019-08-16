import createDebug from 'debug';

import Parser from './parser';

const debug = createDebug('vowlink-irc:irc:peer');

export default class Peer {
  constructor(socket) {
    this.socket = socket;
    this.parser = new Parser();

    this.socket.pipe(this.parser);

    this.nick = null;
    this.user = null;

    this.channels = [];
  }

  async loop() {
    for await (const line of this.parser) {
      debug('got line %j', line);

      if (line.command === 'NICK') {
        this.onNick(line);
      } else if (line.command === 'USER') {
        this.onUser(line);
      } else if (line.command === 'PING') {
        this.onPing(line);
      }
    }
  }

  onNick(line) {
    if (line.params.length < 1) {
      throw new Error('Invalid NICK param count');
    }

    this.nick = line.params[0];
  }

  onUser(line) {
    if (line.params.length < 4) {
      throw new Error('Invalid USER param count');
    }

    if (this.user) {
      throw new Error('Already signed in as: ' + this.user.user);
    }
    if (!this.nick) {
      throw new Error('Must receive NICK before USER');
    }

    this.user = {
      name: line.params[0],
      realname: line.params[3],
      full: `${this.nick}!${line.params[0]}@vowlink`,
    };

    // Acknowledge log in
    this.socket.write(`001 ${this.nick} ` +
      ':Welcome to the Internet Relay Network ' +
      `${this.user.name}\r\n`);

    // Suggest channels to join
    this.socket.write(`:${this.user.full} JOIN #test\r\n`);
  }

  onPing(line) {
    this.socket.write('PONG vowlink\r\n');
  }
}
