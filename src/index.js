import websocket from 'websocket-stream';
import multiplex from 'multiplex';
import http from 'http';
import url from 'url';

import { CLOSE_REASON_NO_SESSION } from './constants/errors';

export const install = (server, opts) => {
  const socket = websocket.createServer({
    server,
    ...opts
  });
  const sessions = {};
  socket._brokerSessions = sessions;
  socket.on('stream', stream => {
    const parsedUrl = url.parse(stream.socket.upgradeReq.url, true);
    if (!parsedUrl.query || !parsedUrl.query.session) {
      return stream.socket.close(CLOSE_REASON_NO_SESSION, 'No session specified');
    }

    const sessionId = parsedUrl.query.session;
    const session = sessions[sessionId];

    stream.on('error', error => {
      console.log('b stream error:', error);
    });

    if (session) {
      // Create a new substream for server multiplex stream
      // and pipe client stream there
      const clientStream = session.plex.createStream('asd'); // TODO: id
      stream.pipe(clientStream).pipe(stream);
      console.log('b new client connected to ' + sessionId);
      stream.on('close', () => {
        console.log('b client disconnected from ' + sessionId);
      });
    } else {
      // Terminate server multiplex stream here and store
      // it for later-connected clients
      const plex = multiplex();
      stream.pipe(plex).pipe(stream);
      const brokerStream = plex.createStream('broker');
      sessions[sessionId] = {
        stream, plex, brokerStream
      };
      stream.on('close', () => {
        // TODO: proper clean-up: close all client streams
        console.log('b server disconnected from ' + sessionId);
        delete sessions[sessionId];
      });
      console.log('b new server connected to ' + sessionId);
    }
  });
  return socket;
};

export const listen = (port, opts, callback) => {
  const server = http.createServer(callback);
  const socket = install(server, opts);
  server.listen(port);
  return socket;
};
