import "../firebase/app.js";
import { initSession, whenReady } from "../auth/session/session.js";
import { db, collection, query, orderBy, limit, onSnapshot } from "../firebase/firestore.js";

initSession();
document.getElementById("hint").textContent =
  "Hanya akun di koleksi admins/{uid} yang bisa membaca. Isi pesan disalin saat report.";

whenReady().then(({ user }) => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  const list = document.getElementById("list");
  list.textContent = "Memuat…";
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(50));
  onSnapshot(
    q,
    (snap) => {
      list.replaceChildren();
      if (snap.empty) {
        const p = document.createElement("p");
        p.className = "empty-state";
        p.textContent = "Tidak ada report / atau Anda bukan admin.";
        list.appendChild(p);
        return;
      }
      snap.docs.forEach((d) => {
        const x = d.data();
        const card = document.createElement("div");
        card.className = "card msg-card";
        const meta = document.createElement("div");
        meta.className = "msg-meta";
        meta.textContent = `${x.targetType || ""} · ${x.status || ""} · ${d.id}`;
        const reason = document.createElement("div");
        reason.className = "msg-body";
        reason.textContent = x.reason || "";
        const body = document.createElement("div");
        body.className = "msg-body";
        body.style.marginTop = "8px";
        body.style.color = "var(--text-2)";
        body.textContent = x.messageBody || "(no body snapshot)";
        card.append(meta, reason, body);
        list.appendChild(card);
      });
    },
    (err) => {
      list.textContent = err.message;
    }
  );
});
