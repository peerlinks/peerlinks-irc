import { Buffer } from 'buffer';
import { Transform } from 'stream';

import createDebug from 'debug';

const debug = createDebug('vowlink-irc:parser');

const PREFIX = /^:([^\s]*) +/g;
const TRAILING = / +:(.*)$/g;

export default class CommandParser extends Transform {
  constructor() {
    super({
      readableObjectMode: true,
    });

    this.buffer = '';
  }

  _transform(chunk, enc, callback) {
    const data = Buffer.from(chunk, enc);

    this.buffer += data;
    if (!/\r\n/.test(this.buffer)) {
      return callback(null);
    }
    const lines = this.buffer.split(/\r\n/g);
    this.buffer = lines.pop();

    for (const line of lines.map((line) => line.trim())) {
      if (!line) {
        continue;
      }
      try {
        const parsed = this.parseLine(line);
        debug('parsed message=%j', parsed);
        this.push(parsed);
      } catch (e) {
        return callback(e);
      }
    }
    callback(null);
  }

  _flush(callback) {
    if (this.buffer.length !== 0) {
      callback(new Error('Ended on pending data: ' + this.buffer));
    } else {
      callback(null);
    }
  }

  parseLine(line) {
    if (/[\0\r\n]/.test(line)) {
      throw new Error('Invalid command: ' + line);
    }

    let prefix;
    let trailing;

    line = line.replace(PREFIX, (_, value) => {
      prefix = value;
      return '';
    });
    line = line.replace(TRAILING, (_, value) => {
      trailing = value;
      return '';
    });

    const params = line.split(/ +/g);
    if (params.some((part) => part.startsWith(':'))) {
      throw new Error('Invalid params: ' + line);
    }
    if (params.length === 0) {
      throw new Error('Missing command: ' + line);
    }

    const command = params.shift();
    if (trailing) {
      params.push(trailing);
    }

    return { prefix, command, params };
  }
}
