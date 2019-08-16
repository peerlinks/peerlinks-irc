import { Buffer } from 'buffer';
import { Transform } from 'stream';

const CRLF = /\r\n/g;
const SPACE = / +/g;
const DISALLOWED = /[\0\r\n]/g;

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
    if (!CRLF.test(this.buffer)) {
      return callback(null);
    }
    const lines = this.buffer.split(CRLF);
    this.buffer = lines.pop();

    for (const line of lines.map((line) => line.trim())) {
      if (!line) {
        continue;
      }
      try {
        this.push(this.parseLine(line));
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
    if (DISALLOWED.test(line)) {
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

    const params = line.split(SPACE);
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
