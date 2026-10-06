import "../firebase/app.js";
    import { initSession, onSession, whenReady, logout, getUser, getProfile } from "../auth/session/session.js";
    import { watchInbox, markRead, setReaction, softDeleteMessage, hardDeleteMessage } from "../features/messages/message.service.js";
    import { reportContent } from "../safety/reporting/report.service.js";
    import { publicLink, createOrUpdateProfile } from "../features/profile/profile.service.js";
    import { toast } from "../core/utilities/toast.js";
    // conversations index disabled — use message.threadSecret
    import { watchThreadMessages, sendThreadMessage } from "../features/conversations/thread.service.js";
        
    
    import { requestNotificationPermission } from "../infrastructure/notifications/fcm.client.js";
    import { initAppCheckStub } from "../infrastructure/app-check/app-check.client.js";
    try { initAppCheckStub(); } catch (e) { console.warn("app-check", e); }

    const view = document.getElementById("view");
    if (view) {
      view.innerHTML = `<div class="empty-state"><p>Loading session…</p></div>`;
    }
    let unsubInbox = null;
    let filter = "all";
    let booted = false;

    function showBootError(msg) {
      console.error(msg);
      if (view) {
        view.innerHTML = `<div class="empty-state"><h3>Gagal memuat</h3><p style="color:var(--danger);word-break:break-word"></p>
          <p style="margin-top:12px;font-size:0.85rem;color:var(--text-3)">Buka F12 → Console untuk detail. Cek juga Auth Anonymous &amp; Firestore index.</p></div>`;
        view.querySelector("p").textContent = String(msg);
      }
    }

    function boot({ user, profile }) {
      if (booted) return;
      if (!user) {
        location.href = "login.html";
        return;
      }
      if (!profile?.username) {
        location.href = "onboarding.html";
        return;
      }
      booted = true;
      const letter = (profile.displayName || profile.username || "?").charAt(0).toUpperCase();
      const av = document.getElementById("me-avatar");
      if (av) av.textContent = letter;
      try {
        route();
      } catch (e) {
        showBootError(e.message || e);
      }
    }

    try {
      initSession();
      whenReady()
        .then(boot)
        .catch((e) => showBootError(e.message || e));
      // Fallback if auth is slow
      setTimeout(() => {
        if (!booted && view && view.textContent.includes("Loading session")) {
          showBootError("Session timeout — refresh atau login ulang");
        }
      }, 15000);
    } catch (e) {
      showBootError(e.message || e);
    }

    onSession((user, profile) => {
      if (!user || !profile?.username) return;
      const av = document.getElementById("me-avatar");
      if (av) av.textContent = (profile.displayName || profile.username).charAt(0).toUpperCase();
      if (!booted) boot({ user, profile });
    });

    function setActive(name) {
      document.querySelectorAll("[data-route]").forEach((a) => {
        a.classList.toggle("active", a.dataset.route === name);
      });
    }

    function route() {
      const hash = (location.hash || "#inbox").replace(/^#/, "").slice(0) || "inbox";
      const name = hash.split("?")[0] || "inbox";
      setActive(name);
      if (unsubInbox) { try { unsubInbox(); } catch (_) {} unsubInbox = null; }
      try {
        if (name === "link") renderLink();
        else if (name === "settings") renderSettings();
        else if (name === "safety") renderSafety();
        else if (name === "conversations") renderConversations();
        else renderInbox();
      } catch (e) {
        console.error(e);
        if (view) {
          view.innerHTML = `<div class="empty-state"><h3>Error</h3><p></p></div>`;
          view.querySelector("p").textContent = e.message || String(e);
        }
      }
    }
    window.addEventListener("hashchange", route);

    function renderInbox() {
      const profile = getProfile();
      view.innerHTML = `
        <h1 class="page-title">Inbox</h1>
        <p class="page-sub">Pesan anonim yang masuk ke akunmu</p>
        <div class="filter-row">
          <button class="chip ${filter==="all"?"active":""}" data-f="all">Semua</button>
          <button class="chip ${filter==="unread"?"active":""}" data-f="unread">Belum dibaca</button>
        </div>
        <div id="list"><div class="empty-state"><p>Memuat…</p></div></div>`;
      view.querySelectorAll("[data-f]").forEach((b) => {
        b.addEventListener("click", () => { filter = b.dataset.f; renderInbox(); });
      });
      const list = document.getElementById("list");
      unsubInbox = watchInbox(getUser().uid, (err, items) => {
        if (err) {
          list.innerHTML = `<div class="empty-state"><h3>Could not load inbox</h3><p>${err.message}</p><p style="margin-top:8px;font-size:0.85rem">Deploy Firestore rules &amp; composite index (recipientUid + createdAt).</p></div>`;
          return;
        }
        let rows = items.filter((m) => m.status !== "deleted");
        if (filter === "unread") rows = rows.filter((m) => !m.read);
        if (!rows.length) {
          list.innerHTML = `<div class="empty-state">
          <div class="empty-icon">📥</div>
          <h3>Inbox kosong</h3>
          <p>Bagikan link profilmu agar orang bisa mengirim pesan anonim.</p>
          <button class="btn btn-primary btn-sm" id="go-link" type="button" style="margin-top:16px">Salin link saya</button>
        </div>`;
        document.getElementById("go-link")?.addEventListener("click", () => { location.hash = "link"; });
          return;
        }
        list.innerHTML = rows.map((m) => {
          const t = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : "";
          return `
          <div class="card msg-card ${m.read ? "" : "unread"}" data-id="${m.id}">
            <div class="msg-meta">
              <span class="badge badge-anon">Anonymous</span>
              <span>${t}</span>
              ${m.reaction && ["❤️","😂","👍","😮"].includes(m.reaction) ? `<span>${m.reaction}</span>` : ""}
            </div>
            <div class="msg-body">${escapeHtml(m.body || "")}</div>
            <div class="msg-actions">
              <button class="btn btn-sm btn-secondary" data-act="read">Mark read</button>
              <button class="btn btn-sm btn-ghost" data-act="heart">❤️</button>
              <button class="btn btn-sm btn-primary" data-act="chat">Continue chat</button>
              <button class="btn btn-sm btn-ghost" data-act="report">Report</button>
              <button class="btn btn-sm btn-primary" data-act="story">Share ke story</button>
              <button class="btn btn-sm btn-danger" data-act="del">Delete</button>
            </div>
          </div>`;
        }).join("");
        list.querySelectorAll(".msg-card").forEach((card) => {
          card.querySelectorAll("[data-act]").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const id = card.dataset.id;
              try {
                if (btn.dataset.act === "read") await markRead(id);
                if (btn.dataset.act === "heart") await setReaction(id, "❤️");
                if (btn.dataset.act === "story") {
                  const answer = prompt("Jawabanmu?");
                  if (!answer) return;
                  const row = items.find((x) => x.id === id);
                  const { renderStoryCard, shareCard } = await import("../features/share/story-card.js");
                  const blob = await renderStoryCard({
                    question: row?.body || "",
                    answer,
                    handle: "@" + (getProfile()?.username || ""),
                  });
                  const how = await shareCard(blob);
                  if (how === "downloaded") toast("Gambar diunduh — upload manual ke story");
                  else if (how === "shared") toast("Dibagikan");
                  return;
                }
                if (btn.dataset.act === "del") {
                  if (confirm("Permanently delete this message?")) await hardDeleteMessage(id);
                }
                if (btn.dataset.act === "report") {
                  const reason = prompt("Reason") || "unspecified";
                  const row = items.find((x) => x.id === id);
                  await reportContent({
                    targetType: "message",
                    targetId: id,
                    reason,
                    messageBody: row?.body || "",
                  });
                  toast("Report submitted");
                }
                if (btn.dataset.act === "chat") {
                  const row = items.find((x) => x.id === id);
                  const secret = row?.threadSecret;
                  if (!secret) {
                    toast("No thread on this message (old message)");
                    return;
                  }
                  location.hash = "conversations";
                  openThread(secret);
                }
              } catch (ex) { toast(ex.message); }
            });
          });
        });
      });
    }

    function renderLink() {
      const p = getProfile();
      const link = publicLink(p.username);
      view.innerHTML = `
        <h1 class="page-title">My link</h1>
        <p class="page-sub">Bagikan link ini. Siapa pun bisa mengirim pesan anonim.</p>
        <div class="card section-card"><div class="card-body">
          <h2>Link publik</h2>
          <div class="link-box">
            <input class="input" id="link" readonly value="${link}" />
            <button class="btn btn-primary" id="copy" type="button">Salin</button>
          </div>
          <p class="muted" style="margin-top:14px">Pratinjau: <a href="u.html?u=${encodeURIComponent(p.username)}" style="color:var(--accent)">u.html?u=${p.username}</a></p>
        </div></div>`;
      document.getElementById("copy").addEventListener("click", async () => {
        await navigator.clipboard.writeText(link);
        toast("Link disalin");
      });
    }

    function renderSettings() {
      const p = getProfile();
      view.innerHTML = `
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">Profil dan preferensi akun</p>
        <div class="card section-card"><div class="card-body">
          <h2>Profil</h2>
          <div class="form-group"><label>Display name</label><input class="input" id="dn" value="${escapeAttr(p.displayName || "")}" /></div>
          <div class="form-group"><label>Bio</label><input class="input" id="bio" value="${escapeAttr(p.bio || "")}" /></div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500">
              <input type="checkbox" id="open" ${p.inboxOpen !== false ? "checked" : ""} /> Inbox terbuka
            </label>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button class="btn btn-primary" id="save">Simpan</button>
          <button class="btn btn-secondary" id="notif" type="button">Notifikasi</button>
          </div>
          <div id="guest-link" style="margin-top:16px;display:none">
            <p style="font-size:0.85rem;color:var(--text-2);margin-bottom:8px">Guest account — link email to keep this inbox permanently.</p>
            <button class="btn btn-secondary btn-sm" id="link-email" type="button">Link email &amp; password</button>
          </div>
          <p style="margin-top:16px;font-size:0.8rem"><a href="privacy.html" style="color:var(--accent)">Privacy</a></p>
        </div></div>`;
      document.getElementById("notif")?.addEventListener("click", async () => {
        const r = await requestNotificationPermission();
        toast(r.ok ? "Notifications enabled" : "Permission: " + (r.permission || r.reason));
      });
      document.getElementById("link-email")?.addEventListener("click", async () => {
        const email = prompt("Email to link");
        const password = prompt("Password (min 6)");
        if (!email || !password) return;
        try {
          const { linkEmailPassword } = await import("../auth/authentication/guest.js");
          await linkEmailPassword(email, password);
          const { createOrUpdateProfile } = await import("../features/profile/profile.service.js");
          await createOrUpdateProfile(getUser().uid, { username: getProfile().username, isGuest: false });
          toast("Account linked — inbox kept");
        } catch (e) { toast(e.message); }
      });
      if (p.isGuest || getUser()?.isAnonymous) {
        const gl = document.getElementById("guest-link");
        if (gl) gl.style.display = "block";
      }
      document.getElementById("save").addEventListener("click", async () => {
        try {
          await createOrUpdateProfile(getUser().uid, {
            username: p.username,
            displayName: document.getElementById("dn").value,
            bio: document.getElementById("bio").value,
            inboxOpen: document.getElementById("open").checked,
          });
          toast("Saved");
          location.reload();
        } catch (ex) { toast(ex.message); }
      });
    }

    function renderSafety() {
      view.innerHTML = `
        <h1 class="page-title">Safety</h1>
        <p class="page-sub">Kami tidak menjual identitas. Lindungi inboxmu dengan fitur di bawah.</p>
        <div class="card section-card"><div class="card-body">
          <ul style="color:var(--text-2);font-size:0.9rem;line-height:1.85;padding-left:0">
            <li style="margin-bottom:8px">• Filter lokal saat mengirim (bisa dilewati — App Check + rules adalah pagar utama)</li>
            <li style="margin-bottom:8px">• <strong>Report</strong> dari kartu pesan di Inbox</li>
            <li style="margin-bottom:8px">• Jeda inbox di Settings</li>
            <li style="margin-bottom:8px">• Hapus pesan secara permanen dari Inbox</li>
            <li style="margin-bottom:8px">• Chat: penerima dari Inbox · pengirim lewat <a href="my-sends.html" style="color:var(--accent)">My sent threads</a></li>
          </ul>
          <p class="muted" style="margin-top:16px"><a href="privacy.html" style="color:var(--accent)">Privasi</a> · <a href="terms.html" style="color:var(--accent)">Syarat</a></p>
        </div></div>`;
    }

    document.getElementById("logout").addEventListener("click", async (e) => {
      e.preventDefault();
      await logout();
      location.href = "index.html";
    });
    document.getElementById("btn-theme").addEventListener("click", () => {
      const d = document.documentElement;
      d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", d.dataset.theme);
    });
    if (localStorage.getItem("theme") === "dark") document.documentElement.dataset.theme = "dark";


    let unsubConv = null;
    function renderConversations() {
      if (unsubInbox) { unsubInbox(); unsubInbox = null; }
      view.innerHTML = `<h1 class="page-title">Chats</h1>
        <p class="page-sub">Percakapan dari pesan yang dilanjutkan. Pengirim: <a href="my-sends.html">My sent threads</a></p>
        <div id="clist"><div class="empty-state"><p>Memuat…</p></div></div>`;
      const list = document.getElementById("clist");
      unsubInbox = watchInbox(getUser().uid, (err, items) => {
        if (err) {
          list.innerHTML = `<div class="empty-state"><h3>Error</h3><p></p></div>`;
          list.querySelector("p").textContent = err.message;
          return;
        }
        const rows = items.filter((m) => m.threadSecret && m.status !== "deleted");
        if (!rows.length) {
          list.innerHTML = `<div class="empty-state">
            <div class="empty-icon">💬</div>
            <h3>Belum ada chat</h3>
            <p>Buka Inbox, pilih pesan, lalu ketuk <strong>Continue chat</strong> untuk membalas secara anonim.</p>
          </div>`;
          return;
        }
        list.replaceChildren();
        rows.forEach((m) => {
          const card = document.createElement("div");
          card.className = "card msg-card";
          const meta = document.createElement("div");
          meta.className = "msg-meta";
          meta.textContent = "Anonymous · " + (m.threadSecret || "").slice(0, 8) + "…";
          const body = document.createElement("div");
          body.className = "msg-body";
          body.textContent = (m.body || "").slice(0, 120);
          const btn = document.createElement("button");
          const actions = document.createElement("div");
          actions.className = "msg-actions";
          btn.className = "btn btn-sm btn-primary";
          btn.textContent = "Buka chat";
          btn.onclick = () => openThread(m.threadSecret);
          actions.appendChild(btn);
          card.append(meta, body, actions);
          list.appendChild(card);
        });
      });
    }

    
    function openThread(secret) {
      if (typeof unsubMsgs !== "undefined" && unsubMsgs) try { unsubMsgs(); } catch (_) {}
      view.innerHTML = `
        <button class="btn btn-ghost btn-sm" id="back-chats" type="button">← Kembali</button>
        <h1 class="page-title" style="margin-top:12px">Chat anonim</h1>
        <p class="page-sub">Balasan tetap anonim bagi lawan bicara.</p>
        <div id="msgs" style="min-height:220px;margin-bottom:16px"></div>
        <div class="card"><div class="card-body chat-composer">
          <input class="input" id="cbody" placeholder="Tulis balasan…" autocomplete="off" />
          <button class="btn btn-primary" id="csend" type="button">Kirim</button>
        </div></div>`;
      document.getElementById("back-chats").onclick = () => { location.hash = "conversations"; };
      const box = document.getElementById("msgs");
      window.__unsubThread = watchThreadMessages(secret, (err, items) => {
        if (err) { box.innerHTML = `<p>${err.message}</p>`; return; }
        box.innerHTML = items.map((m) => `
          <div class="card msg-card" style="margin-bottom:8px">
            <div class="msg-meta"><span class="badge ${m.authorUid === getUser().uid ? "badge-accent" : "badge-anon"}">${m.authorUid === getUser().uid ? "Kamu" : "Anonim"}</span></div>
            <div class="msg-body">${escapeHtml(m.body || "")}</div>
          </div>`).join("") || `<div class="empty-state"><div class="empty-icon">✉️</div><h3>Belum ada balasan</h3><p>Kirim pesan pertama di bawah.</p></div>`;
      });
      document.getElementById("csend").onclick = async () => {
        try {
          await sendThreadMessage(secret, document.getElementById("cbody").value);
          document.getElementById("cbody").value = "";
        } catch (e) { toast(e.message); }
      };
      
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
    }
    function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }
