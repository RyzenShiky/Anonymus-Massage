import "../firebase/app.js";
import { ensureSenderAnonymous, getSenderDb } from "../firebase/sender-app.js";
import {
  listLocalSecrets,
  watchThreadMessages,
  sendThreadMessage,
  getThread,
} from "../features/conversations/thread.service.js";
import { toast } from "../core/utilities/toast.js";

const list = document.getElementById("list");

try {
  await ensureSenderAnonymous();
} catch (e) {
  list.textContent = "Gagal login anonim: " + (e.message || e);
  throw e;
}

const sdb = getSenderDb();
const secrets = listLocalSecrets();
const keys = Object.keys(secrets);

if (!keys.length) {
  list.textContent = "Belum ada thread di perangkat ini.";
} else {
  for (const secret of keys) {
    const card = document.createElement("div");
    card.className = "card msg-card";
    const meta = document.createElement("div");
    meta.className = "msg-meta";
    meta.textContent = "Secret " + secret.slice(0, 8) + "…";
    try {
      const t = await getThread(secret, sdb);
      if (!t) meta.textContent += " (not found / wrong session)";
    } catch (e) {
      meta.textContent += " (" + (e.message || "error") + ")";
    }
    const open = document.createElement("button");
    open.className = "btn btn-sm btn-primary";
    open.textContent = "Open";
    open.onclick = () => openThread(secret);
    card.append(meta, open);
    list.appendChild(card);
  }
}

function openThread(secret) {
  list.replaceChildren();
  const box = document.createElement("div");
  box.id = "msgs";
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.marginTop = "12px";
  const input = document.createElement("input");
  input.className = "input";
  input.placeholder = "Reply…";
  input.style.flex = "1";
  const send = document.createElement("button");
  send.className = "btn btn-primary";
  send.textContent = "Send";
  send.onclick = async () => {
    try {
      await sendThreadMessage(secret, input.value, sdb);
      input.value = "";
    } catch (e) {
      toast(e.message);
    }
  };
  row.append(input, send);
  list.append(box, row);
  watchThreadMessages(secret, (err, items) => {
    box.replaceChildren();
    if (err) {
      box.textContent = err.message;
      return;
    }
    items.forEach((m) => {
      const d = document.createElement("div");
      d.className = "card msg-card";
      d.style.marginBottom = "8px";
      const b = document.createElement("div");
      b.className = "msg-body";
      b.textContent = m.body || "";
      d.appendChild(b);
      box.appendChild(d);
    });
  }, sdb);
}
