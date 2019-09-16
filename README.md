# peerlinks-irc
[![Build Status](https://travis-ci.org/peerlinks/peerlinks-irc.svg?branch=master)](http://travis-ci.org/peerlinks/peerlinks-irc)

WIP implementation of IRC bridge for [PeerLinks][].

## Testing Instructions

```sh
git clone git://github.com/peerlinks/peerlinks-irc
cd peerlinks-irc
npm install
npm start
```

`npm start` will start an unencrypted IRC server on port 1337 (configurable
via `PORT` env variable) and unconfigurable host `127.0.0.1`. When connected to
this server an IRC client will display:

1. A channel with the same name as the identity used for login
2. A private message from `peerlinks`

To request an invite send `requestInvite` to `peerlinks` and share the response
with someone who runs the same server on the other machine. The reply will
contain instructions and once they are executed - you should see a new channel
appear in your IRC client.

From this point you can communicate with that person and invite more people
into the channel.

**WARNING: This is a WIP prototype so things may crash or not work as
expected**

## LICENSE

This software is licensed under the MIT License.

Copyright Fedor Indutny, 2019.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.

[peerlinks]: https://github.com/peerlinks/peerlinks
