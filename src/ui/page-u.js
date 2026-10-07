import "../firebase/app.js"; // App Check init
    import { getProfileByUsername } from "../features/profile/profile.service.js";
    import { sendAnonymousMessage } from "../features/messages/message.service.js";
    import { localToxicityCheck, makeAnonSessionId } from "../safety/filtering/local-filter.js";
    import { analyzeText } from "../wasm/text-engine/runtime/adapter.js";
    import { toast } from "../core/utilities/toast.js";
    import { toUsername } from "../core/utilities/slug.js";

    function safeHex(c) {
      return /^#[0-9a-fA-F]{6}$/.test(c || "") ? c : "#5b5ce2";
    }

    const params = new URLSearchParams(location.search);
    let username = params.get("u") || "";
    if (!username) {
      const m = location.pathname.match(/\/u\/([a-z0-9_]+)/i);
      if (m) username = m[1];
    }
    username = toUsername(username);

    const main = document.getElementById("main");
    let sessionId = sessionStorage.getItem("anonSession") || makeAnonSessionId();
    sessionStorage.setItem("anonSession", sessionId);

    function showEmpty(title, sub) {
      main.replaceChildren();
      const d = document.createElement("div");
      d.className = "empty-state";
      const h = document.createElement("h3");
      h.textContent = title;
      const p = document.createElement("p");
      p.textContent = sub;
      d.append(h, p);
      main.appendChild(d);
    }

    try {
      if (!username) {
        showEmpty("Invalid profile", "Missing username");
      } else {
        const profile = await getProfileByUsername(username);
        if (!profile) {
          showEmpty("Profile not found", "@" + username);
        } else if (profile.inboxOpen === false) {
          showEmpty("Inbox paused", "@" + (profile.username || username) + " is not accepting messages.");
        } else {
          main.replaceChildren();
          const wrap = document.createElement("div");
          const header = document.createElement("div");
          header.className = "profile-header";
          const av = document.createElement("div");
          av.className = "avatar avatar-lg";
          av.style.margin = "0 auto";
          av.style.background = safeHex(profile.avatarColor);
          av.textContent = (profile.displayName || profile.username || "?").charAt(0).toUpperCase();
          const h1 = document.createElement("h1");
          h1.textContent = "@" + (profile.username || username);
          const bio = document.createElement("p");
          bio.className = "bio";
          bio.textContent = profile.bio || "Ask me anything";
          header.append(av, h1, bio);

          const card = document.createElement("div");
          card.className = "card compose-card";
          const body = document.createElement("div");
          body.className = "card-body";
          const ta = document.createElement("textarea");
          ta.className = "textarea";
          ta.id = "body";
          ta.placeholder = "Write anonymously…";
          ta.maxLength = 2000;
          const hint = document.createElement("p");
          hint.className = "hint";
          hint.textContent = "Your identity stays hidden from the recipient. Analytics are not enabled by default.";
          const btn = document.createElement("button");
          btn.className = "btn btn-primary btn-block";
          btn.id = "send";
          btn.type = "button";
          btn.style.marginTop = "12px";
          btn.textContent = "Send anonymously";
          body.append(ta, hint, btn);
          card.appendChild(body);
          wrap.append(header, card);
          main.appendChild(wrap);

          btn.addEventListener("click", async () => {
            const text = ta.value;
            const check = localToxicityCheck(text);
            if (!check.ok) { toast(check.reason); return; }
            const wasm = await analyzeText(text);
            if (!wasm.ok) { toast("Blocked by local text filter"); return; }
            btn.disabled = true;
            try {
              await sendAnonymousMessage({
                recipientUid: profile.uid,
                recipientUsername: profile.username,
                body: text,
                sessionId,
              });
              ta.value = "";
              toast("Sent anonymously");
            } catch (ex) {
              console.error(ex);
              toast(ex.message || "Failed to send");
            } finally {
              btn.disabled = false;
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
      showEmpty(
        "Gagal memuat profil",
        navigator.onLine ? "Koneksi ke server bermasalah. Coba lagi sebentar." : "Kamu sedang offline."
      );
      const retry = document.createElement("button");
      retry.className = "btn btn-secondary";
      retry.textContent = "Coba lagi";
      retry.onclick = () => location.reload();
      main.querySelector(".empty-state")?.appendChild(retry);
    }
