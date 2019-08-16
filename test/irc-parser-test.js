/* eslint-env node, mocha */
import * as assert from 'assert';
import { PassThrough } from 'stream';

import Parser from '../lib/irc/parser';

describe('IRC Parser', () => {
  it('should parse messages', (callback) => {
    const r = new PassThrough();
    const parser = new Parser();

    r.write(':prefix command p1 p2 p3\r\n');
    r.write(':prefix command\r\n');
    r.write('command\r\n');
    r.write('command p1 :trailing parameter with colon: and further text\r\n');
    r.end();

    r.pipe(parser);

    const commands = [];
    parser.on('data', (command) => {
      commands.push(command);
    });
    parser.once('end', () => {
      assert.deepStrictEqual(commands, [
        { prefix: 'prefix', command: 'command', params: [ 'p1', 'p2', 'p3' ] },
        { prefix: 'prefix', command: 'command', params: [] },
        { prefix: undefined, command: 'command', params: [] },
        {
          prefix: undefined,
          command: 'command',
          params: [
            'p1',
            'trailing parameter with colon: and further text',
          ],
        },
      ]);
      callback();
    });
  });
});
