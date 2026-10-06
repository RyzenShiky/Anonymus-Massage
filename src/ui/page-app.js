import "/src/firebase/app.js";
    import { initSession, onSession, whenReady, logout, getUser, getProfile } from "/src/auth/session/session.js";
    import { watchInbox, markRead, setReaction, softDeleteMessage, hardDeleteMessage } from "/src/features/messages/message.service.js";
    import { reportContent } from "/src/safety/reporting/report.service.js";
    import { publicLink, createOrUpdateProfile } from "/src/features/profile/profile.service.js";
    import { toast } from "/src/core/utilities/toast.js";
    // conversations index disabled — use message.threadSecret
    import { watchThreadMessages, sendThreadMessage } from "/src/features/conversations/thread.service.js";
        
    
    import { requestNotificationPermission } from "/src/infrastructure/notifications/fcm.client.js";
    import { initAppCheckStub } from "/src/infrastructure/app-check/app-check.client.js";
    initAppCheckStub();

    initSession();
    const view = document.getElementById("view");
    let unsubInbox = null;
    let filter = "all";

    whenReady().then(({ user, profile }) => {
      if (!user) {
        location.href = "login.html";
        return;
      }
      if (!profile?.username) {
        location.href = "onboarding.html";
        return;
      }
      document.getElementById("me-avatar").textContent = (profile.displayName || profile.username).charAt(0).toUpperCase();
      route();
    });
    onSession((user, profile) => {
      if (!user) return; // ignore until ready handled
      if (profile?.username) {
        document.getElementById("me-avatar").textContent = (profile.displayName || profile.username).charAt(0).toUpperCase();
      }
    });

    function setActive(name) {
      document.querySelectorAll("[data-route]").forEach((a) => {
        a.classList.toggle("active", a.dataset.route === name);
      });
    }

    function route() {
      const hash = (location.hash || "#inbox").slice(1);
      setActive(hash);
      if (unsubInbox) { unsubInbox(); unsubInbox = null; }
      if (hash === "link") renderLink();
      else if (hash === "settings") renderSettings();
      else if (hash === "safety") renderSafety();
      else if (hash === "conversations") renderConversations();
      else if (hash === "link") renderLink();
      else renderInbox();
    }
    window.addEventListener("hashchange", route);

    function renderInbox() {
      const profile = getProfile();
      view.innerHTML = `
        <h1 class="page-title">Inbox</h1>
        <div class="filter-row">
          <button class="chip ${filter==="all"?"active":""}" data-f="all">All</button>
          <button class="chip ${filter==="unread"?"active":""}" data-f="unread">Unread</button>
        </div>
        <div id="list"><div class="empty-state"><p>Loading…</p></div></div>`;
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
          list.innerHTML = `<div class="empty-state"><h3>No messages yet</h3><p>Share your link to receive anonymous messages.</p></div>`;
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
                  const { renderStoryCard, shareCard } = await import("/src/features/share/story-card.js");
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
        <div class="card"><div class="card-body">
          <p style="color:var(--text-2);margin-bottom:12px">Share this link. Anyone can message you anonymously.</p>
          <div class="link-box">
            <input class="input" id="link" readonly value="${link}" />
            <button class="btn btn-primary" id="copy" type="button">Copy</button>
          </div>
          <p style="margin-top:16px;font-size:0.85rem;color:var(--text-3)">Preview: <a href="u.html?u=${p.username}" style="color:var(--accent)">u.html?u=${p.username}</a></p>
        </div></div>`;
      document.getElementById("copy").addEventListener("click", async () => {
        await navigator.clipboard.writeText(link);
        toast("Link copied");
      });
    }

    function renderSettings() {
      const p = getProfile();
      view.innerHTML = `
        <h1 class="page-title">Settings</h1>
        <div class="card"><div class="card-body">
          <div class="form-group"><label>Display name</label><input class="input" id="dn" value="${escapeAttr(p.displayName || "")}" /></div>
          <div class="form-group"><label>Bio</label><input class="input" id="bio" value="${escapeAttr(p.bio || "")}" /></div>
          <div class="form-group">
            <label><input type="checkbox" id="open" ${p.inboxOpen !== false ? "checked" : ""} /> Inbox open</label>
          </div>
          <button class="btn btn-primary" id="save">Save</button>
          <button class="btn btn-secondary" id="notif" type="button" style="margin-left:8px">Enable notifications</button>
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
          const { linkEmailPassword } = await import("/src/auth/authentication/guest.js");
          await linkEmailPassword(email, password);
          const { createOrUpdateProfile } = await import("/src/features/profile/profile.service.js");
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
        <h1 class="page-title">Safety Center</h1>
        <div class="card"><div class="card-body">
          <p style="color:var(--text-2);margin-bottom:12px">We don't sell anonymity. Block, report, and filters protect your inbox.</p>
          <ul style="color:var(--text-2);font-size:0.9rem;line-height:1.8">
            <li>• Local pre-filter (bypassable — server must enforce)</li>
            <li>• Report to Firestore <code>reports</code> collection</li>
            <li>• Pause inbox in Settings</li>
            <li>• Hard-delete removes message document</li>
            <li>• Full moderation queue needs deployed Cloud Functions</li>
            <li>• Threads: pengirim pakai /public/my-sends.html; secret di perangkat</li>
          </ul>
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
        <p style="font-size:0.8rem;color:var(--text-3);margin-bottom:12px">
          Dari pesan yang punya thread. Pengirim: <a href="my-sends.html" style="color:var(--accent)">My sent threads</a>
        </p>
        <div id="clist"><p class="empty-state">Loading…</p></div>`;
      const list = document.getElementById("clist");
      unsubInbox = watchInbox(getUser().uid, (err, items) => {
        if (err) {
          list.innerHTML = `<div class="empty-state"><h3>Error</h3><p></p></div>`;
          list.querySelector("p").textContent = err.message;
          return;
        }
        const rows = items.filter((m) => m.threadSecret && m.status !== "deleted");
        if (!rows.length) {
          list.innerHTML = `<div class="empty-state"><h3>No threads yet</h3><p>Open a message and use Continue chat.</p></div>`;
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
          btn.className = "btn btn-sm btn-primary";
          btn.textContent = "Open";
          btn.onclick = () => openThread(m.threadSecret);
          card.append(meta, body, btn);
          list.appendChild(card);
        });
      });
    }

    
    function openThread(secret) {
      if (typeof unsubMsgs !== "undefined" && unsubMsgs) try { unsubMsgs(); } catch (_) {}
      view.innerHTML = `
        <button class="btn btn-ghost btn-sm" id="back-chats">← Chats</button>
        <h1 class="page-title" style="margin-top:8px">Anonymous thread</h1>
        <p class="muted" style="font-size:0.8rem;color:var(--text-3);margin-bottom:8px">Secret: ${secret.slice(0,8)}… (capability URL)</p>
        <div id="msgs" style="min-height:200px;margin-bottom:12px"></div>
        <div class="card"><div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="input" id="cbody" placeholder="Message…" style="flex:1;min-width:140px" />
          <button class="btn btn-primary" id="csend">Send</button>
          
        </div></div>`;
      document.getElementById("back-chats").onclick = () => { location.hash = "conversations"; };
      const box = document.getElementById("msgs");
      window.__unsubThread = watchThreadMessages(secret, (err, items) => {
        if (err) { box.innerHTML = `<p>${err.message}</p>`; return; }
        box.innerHTML = items.map((m) => `
          <div class="card msg-card" style="margin-bottom:8px">
            <div class="msg-meta"><span class="badge badge-anon">${m.authorUid === getUser().uid ? "You" : "Them"}</span></div>
            <div class="msg-body">${escapeHtml(m.body || "")}</div>
          </div>`).join("") || `<p class="empty-state">No messages yet</p>`;
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
