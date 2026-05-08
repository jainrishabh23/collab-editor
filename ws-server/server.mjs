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
import { createClient } from "@supabase/supabase-js";
import { Schema } from "prosemirror-model";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";

// --- Supabase persistence ---------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[ws-server] missing Supabase env. Need SUPABASE_URL (or " +
      "NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY. The `pnpm ws` " +
      "script loads them via `node --env-file-if-exists=.env.local`.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Tiptap StarterKit-compatible schema. Node names are camelCase to match the
// JSON Tiptap emits (heading/bulletList/codeBlock/...). prosemirror-schema-basic
// uses snake_case (heading/bullet_list/code_block) which would fail to validate
// Tiptap-emitted content. parseDOM/toDOM are intentionally omitted: we only
// build Y.XmlFragment trees from JSON, never render to HTML on the server.
const tiptapSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    heading: {
      content: "inline*",
      group: "block",
      defining: true,
      attrs: { level: { default: 1 } },
    },
    bulletList: { content: "listItem+", group: "block" },
    orderedList: {
      content: "listItem+",
      group: "block",
      attrs: {
        start: { default: 1 },
        type: { default: null },
      },
    },
    listItem: { content: "paragraph block*", defining: true },
    codeBlock: {
      content: "text*",
      group: "block",
      marks: "",
      code: true,
      defining: true,
      attrs: { language: { default: null } },
    },
    blockquote: { content: "block+", group: "block", defining: true },
    horizontalRule: { group: "block" },
    hardBreak: { inline: true, group: "inline", selectable: false },
  },
  marks: {
    bold: {},
    italic: {},
    strike: {},
    code: {},
    link: {
      attrs: {
        href: { default: null },
        target: { default: null },
        rel: { default: null },
        class: { default: null },
      },
      inclusive: false,
    },
  },
});

// PostgREST returns bytea as Postgres hex format ('\\x...'). Some setups return
// base64. Normalize whatever the client gives us into a Uint8Array.
function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  if (typeof value !== "string") {
    throw new Error(`unrecognized yjs_state type: ${typeof value}`);
  }
  if (value.startsWith("\\x")) {
    const hex = value.slice(2);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function loadFromSupabase(docId, doc) {
  const { data, error } = await supabase
    .from("documents")
    .select("yjs_state,content")
    .eq("id", docId)
    .maybeSingle();

  if (error) {
    console.error(`[persist] load failed for ${docId}: ${error.message}`);
    return;
  }
  if (!data) {
    console.log(`[persist] no row for ${docId} — starting blank`);
    return;
  }

  if (data.yjs_state) {
    const bytes = toUint8Array(data.yjs_state);
    Y.applyUpdate(doc, bytes);
    console.log(
      `[persist] loaded ${docId} from yjs_state (${bytes.byteLength} bytes)`,
    );
    return;
  }

  if (data.content) {
    try {
      const fragment = doc.getXmlFragment("default");
      prosemirrorJSONToYXmlFragment(tiptapSchema, data.content, fragment);
      console.log(`[persist] seeded ${docId} from legacy content`);
      // Persist the seeded state so we don't seed twice on the next load.
      await saveToSupabase(docId, doc);
    } catch (err) {
      console.error(
        `[persist] failed to seed ${docId} from legacy content: ${err.message}`,
      );
    }
    return;
  }

  console.log(`[persist] ${docId} has no persisted state — starting blank`);
}

async function saveToSupabase(docId, doc) {
  const update = Y.encodeStateAsUpdate(doc);
  // PostgREST accepts bytea as a hex string `\x...` on write.
  const hex = Buffer.from(update).toString("hex");
  const { error } = await supabase
    .from("documents")
    .update({ yjs_state: `\\x${hex}` })
    .eq("id", docId);

  if (error) {
    console.error(`[persist] save failed for ${docId}: ${error.message}`);
    return;
  }
  console.log(`[persist] saved ${docId} (${update.byteLength} bytes)`);
}

const SAVE_DEBOUNCE_MS = 5000;

function scheduleSave(room) {
  if (!room.docId) return;
  if (room.saveTimer) clearTimeout(room.saveTimer);
  room.savePending = true;
  room.saveTimer = setTimeout(() => {
    room.saveTimer = null;
    room.savePending = false;
    saveToSupabase(room.docId, room.doc).catch((err) => {
      console.error(`[persist] save crashed for ${room.docId}:`, err);
    });
  }, SAVE_DEBOUNCE_MS);
}

function flushSaveNow(room) {
  if (!room.docId || !room.savePending) return;
  if (room.saveTimer) clearTimeout(room.saveTimer);
  room.saveTimer = null;
  room.savePending = false;
  saveToSupabase(room.docId, room.doc).catch((err) => {
    console.error(`[persist] flush crashed for ${room.docId}:`, err);
  });
}

// --- ws-server core (sync + awareness) -------------------------------------

const PORT = parseInt(process.env.WS_PORT || "1234", 10);
const HOST = process.env.WS_HOST || "0.0.0.0";

const messageSync = 0;
const messageAwareness = 1;

const docs = new Map();
// Dedupes concurrent loads when two clients hit the same fresh room at once.
const loadingDocs = new Map();

async function getOrLoadYDoc(name) {
  const existing = docs.get(name);
  if (existing) return existing;

  const inflight = loadingDocs.get(name);
  if (inflight) return inflight;

  const promise = (async () => {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);
    const conns = new Map();

    // Room naming convention: "doc-<uuid>" → docId is the UUID.
    const docId = name.startsWith("doc-") ? name.slice(4) : null;

    // Load BEFORE wiring update listeners so the initial Y.applyUpdate doesn't
    // bounce back into scheduleSave on first creation.
    if (docId) {
      try {
        await loadFromSupabase(docId, doc);
      } catch (err) {
        console.error(`[persist] load crashed for ${docId}:`, err);
      }
    }

    const room = {
      doc,
      awareness,
      conns,
      docId,
      saveTimer: null,
      savePending: false,
    };

    // Sync broadcast — preserved verbatim from the original handler, plus a
    // debounced save trigger at the end.
    doc.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      conns.forEach((_, conn) => {
        if (conn !== origin && conn.readyState === 1) conn.send(message);
      });
      scheduleSave(room);
    });

    // Awareness logic — preserved verbatim from the original handler.
    awareness.on("update", ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);
      conns.forEach((_, conn) => {
        if (conn.readyState === 1) conn.send(message);
      });
    });

    docs.set(name, room);
    return room;
  })();

  loadingDocs.set(name, promise);
  try {
    return await promise;
  } finally {
    loadingDocs.delete(name);
  }
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
        conn,
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

wss.on("connection", async (conn, req) => {
  const roomName = (req.url || "/").slice(1).split("?")[0] || "default";
  conn.binaryType = "arraybuffer";

  // Buffer pre-load messages so the client's syncStep1 (sent immediately on
  // connect) isn't dropped while we await the room load.
  let room = null;
  const pending = [];
  conn.on("message", (data) => {
    if (room) {
      handleMessage(conn, room, new Uint8Array(data));
    } else {
      pending.push(data);
    }
  });

  let loaded;
  try {
    loaded = await getOrLoadYDoc(roomName);
  } catch (err) {
    console.error(`[ws] failed to load room ${roomName}:`, err);
    if (conn.readyState <= 1) conn.close(1011, "internal error");
    return;
  }

  if (conn.readyState !== 1) return; // closed during load

  room = loaded;
  conn.on("close", () => {
    room.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [conn],
      "connection closed",
    );
    if (room.conns.size === 0) {
      flushSaveNow(room);
    }
  });
  room.conns.set(conn, new Set());

  for (const data of pending) {
    handleMessage(conn, room, new Uint8Array(data));
  }
  pending.length = 0;

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
        Array.from(awarenessStates.keys()),
      ),
    );
    safeSend(conn, encoding.toUint8Array(awEncoder));
  }

  console.log(
    `[ws] client joined room: ${roomName} (total in room: ${room.conns.size})`,
  );
});

server.listen(PORT, HOST, () => {
  console.log(`Yjs WebSocket server listening on ws://${HOST}:${PORT}`);
});
