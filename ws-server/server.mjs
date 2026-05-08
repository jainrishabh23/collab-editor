import { WebSocketServer } from "ws";
import http from "http";
import * as Y from "yjs";
import {
  writeSyncStep1,
  writeUpdate,
  readSyncMessage,
} from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as map from "lib0/map";

const PORT = parseInt(process.env.WS_PORT || "1234", 10);
const HOST = process.env.WS_HOST || "0.0.0.0";

const messageSync = 0;
const messageAwareness = 1;

const docs = new Map();

function getYDoc(name) {
  return map.setIfUndefined(docs, name, () => {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);
    const conns = new Map();

    doc.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === 1) conn.send(message);
      });
    });

    awareness.on("update", ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const message = encoding.toUint8Array(encoder);
      conns.forEach((_, conn) => {
        if (conn.readyState === 1) conn.send(message);
      });
    });

    return { doc, awareness, conns };
  });
}

function safeSend(conn, message) {
  if (conn.readyState !== 1) return;
  try {
    conn.send(message);
  } catch (err) {
    console.error("Send failed:", err);
  }
}

function handleMessage(conn, room, data) {
  try {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    if (messageType === messageSync) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      readSyncMessage(decoder, encoder, room.doc, conn);
      if (encoding.length(encoder) > 1) {
        safeSend(conn, encoding.toUint8Array(encoder));
      }
    } else if (messageType === messageAwareness) {
      awarenessProtocol.applyAwarenessUpdate(
        room.awareness,
        decoding.readVarUint8Array(decoder),
        conn
      );
    }
  } catch (err) {
    console.error("Message handling error:", err);
  }
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Yjs WebSocket server is running.\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  const roomName = (req.url || "/").slice(1).split("?")[0] || "default";
  const room = getYDoc(roomName);

  conn.binaryType = "arraybuffer";
  room.conns.set(conn, new Set());

  conn.on("message", (data) => {
    handleMessage(conn, room, new Uint8Array(data));
  });

  conn.on("close", () => {
    room.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [conn],
      "connection closed"
    );
  });

  // Send sync step 1 so the client requests our state.
  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  writeSyncStep1(syncEncoder, room.doc);
  safeSend(conn, encoding.toUint8Array(syncEncoder));

  // Send current awareness states.
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awEncoder = encoding.createEncoder();
    encoding.writeVarUint(awEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    safeSend(conn, encoding.toUint8Array(awEncoder));
  }

  console.log(`[ws] client joined room: ${roomName} (total in room: ${room.conns.size})`);
});

server.listen(PORT, HOST, () => {
  console.log(`Yjs WebSocket server listening on ws://${HOST}:${PORT}`);
});