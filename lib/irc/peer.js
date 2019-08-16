import { Buffer } from 'buffer';

import createDebug from 'debug';

import Parser from './parser';

const debug = createDebug('vowlink-irc:irc:peer');

export default class Peer {
  constructor({ socket, vowlink }) {
    this.socket = socket;
    this.vowlink = vowlink;
    this.inviteWaitList = inviteWaitList;

    this.parser = new Parser();

    this.socket.pipe(this.parser);

    this.nick = null;
    this.user = null;

    this.identity = null;
  }

  close() {
  }

  async loop() {
    for await (const line of this.parser) {
      debug('got line %j', line);

      if (line.command === 'NICK') {
        this.onNick(line);
      } else if (line.command === 'USER') {
        await this.onUser(line);
      } else if (line.command === 'PING') {
        this.onPing(line);
      } else if (line.command === 'PRIVMSG') {
        await this.onPrivMsg(line);
      } else if (line.command === 'ISON') {
        this.onIsOn(line);
      } else if (line.command === 'JOIN') {
        this.onJoin(line);
      }
    }
  }

  send(msg) {
    debug('sending response: %j', msg)
    return this.socket.write(`${msg}\r\n`);
  }

  onNick(line) {
    if (line.params.length < 1) {
      throw new Error('Invalid NICK param count');
    }

    this.nick = line.params[0];
  }

  async onUser(line) {
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
    this.send(`001 ${this.nick} ` +
      ':Welcome to the Internet Relay Network ' +
      `${this.user.name}`);

    // Get or create identity
    this.identity = this.vowlink.getIdentity(this.user.name);
    if (!this.identity) {
      this.identity = await this.vowlink.createIdentity(this.user.name);
    }

    // Suggest channels to join
    for (const channel of this.vowlink.channels) {
      this.send(`:${this.nick} JOIN #${channel.name}`);
    }

    this.send(`:vowlink PRIVMSG ${this.nick} :Hello!`);
    this.send(`:vowlink PRIVMSG ${this.nick} ` +
      ':Send "help" to get list of available commands');
  }

  onPing() {
    this.send('PONG vowlink', 'vowlink');
  }

  async onPrivMsg(line) {
    if (line.params.length < 2) {
      throw new Error('Not enough params for PRIVMSG');
    }

    let channel = line.params[0];
    const message = line.params[1];
    if (channel === 'vowlink') {
      return await this.onVowLinkCommand(message);
    }

    if (!channel.startsWith('#')) {
      debug('no such user %j', channel);
      this.send(`401 ERR_NOSUCHNICK ${channel} :No such nick/channel`);
      return;
    }

    channel = channel.slice(1);
  }

  async onVowLinkCommand(message) {
    const params = message.split(/\s+/g).map((param) => param)
      .filter((param) => param);
    if (params.length < 1) {
      debug('invalid vowlink message %j', message);
      return;
    }

    let response;

    const command = params.shift();
    debug('vowlink command=%j params=%j', command, params);
    if (command === 'requestInvite') {
      response = this.requestInvite();
    } else if (command === 'issueInvite') {
      response = this.issueInvite(params);
    } else {
      response = [
        'Known commands:',
        '* requestInvite',
        '* issueInvite',
      ];
    }

    for (const text of response) {
      this.send(`:vowlink PRIVMSG ${this.nick} :${text}`);
    }
  }

  onIsOn(line) {
    const on = line.params.filter((param) => param === 'vowlink');
    this.send(`303 RPL_ISON ${on.join(' ')}`);
  }

  onJoin(line) {
    if (line.params.length < 1) {
      throw new Error('Invalid JOIN param count');
    }

    const channels = line.params[0].split(',');
    for (const channelName of channels) {
      const channel = this.vowlink.getChannel(channelName.slice(1));
      if (channel) {
        this.send(`331 ERR_NOTOPIC ${channelName} :No topic set`);
      } else {
        this.send(`403 ERR_NOSUCHCHANNEL ${channelName} ` +
          ':No invite found for this channel');
      }
    }
  }

  //
  // VowLink messages
  //

  requestInvite() {
    const { requestId, request, decrypt } = this.identity.requestInvite();
    const base64 = request.toString('base64');

    const requestHexId = requestId.toString('hex');

    const waitEntry = this.inviteWaitList.waitFor(requestHexId, INVITE_TIMEOUT);
    this.inviteWaitEntries.add(waitEntry);

    waitEntry.promise.then(async (invite) => {
      return await this.receiveInvite(invite, decrypt);
    }).catch((err) => {
      this.send(`:vowlink NOTICE ${this.nick} ` +
        `:Invite request ${requestHexId} error: ` + err.message);
    }).finally(() => {
      this.inviteWaitEntries.delete(waitEntry);
    });

    return [
      `Invite request id: ${requestHexId}`,
      'Ask your peer to replace #channel-name below and run:',
      `/msg vowlink issueInvite ${this.identity.name} ${base64} ` +
        '#channel-name',
    ];
  }

  async receiveInvite(invite, decrypt) {
    invite = JSON.parse(invite);
    invite = {
      requestId: Buffer.from(invite.requestId, 'base64'),
      box: Buffer.from(invite.box, 'base64'),
    };

    invite = decrypt(invite);

    const channel = await this.vowlink.channelFromInvite(
      invite, this.identity);
    await this.vowlink.addChannel(channel);
    await this.vowlink.saveIdentity(this.identity);

    this.send(`:${this.nick} JOIN #${channel.name}`);
  }

  issueInvite(params) {
    if (params.length !== 3) {
      return [
        'Invalid parameter count. Expected `issueInvite name base64 channel`',
      ];
    }

    const [ trusteeName, base64, channelName ] = params;
    if (!channelName.startsWith('#')) {
      return [ 'Channel name must start with #. Got: ' + channelName ];
    }

    const channel = this.vowlink.getChannel(channelName.slice(1));
    if (!channel) {
      return [ `Channel not found: ${channelName}` ];
    }
  }
}
