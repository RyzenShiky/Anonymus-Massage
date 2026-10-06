import "../firebase/app.js";
    import { registerEmail } from "../firebase/auth.js";
    import { createOrUpdateProfile } from "../features/profile/profile.service.js";
    import { isValidUsername, toUsername, isReservedUsername } from "../core/utilities/slug.js";
    import { initSession } from "../auth/session/session.js";
    initSession();
    const err = document.getElementById("err");
    document.getElementById("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      err.classList.remove("show");
      const u = toUsername(document.getElementById("username").value);
      if (isReservedUsername(u)) {
        err.textContent = "Username reserved"; err.classList.add("show"); return;
      }
      if (!isValidUsername(u)) {
        err.textContent = "Username: 3–24 chars, letters, numbers, underscore";
        err.classList.add("show");
        return;
      }
      try {
        const cred = await registerEmail(document.getElementById("email").value, document.getElementById("password").value, u);
        await createOrUpdateProfile(cred.user.uid, { username: u, displayName: u });
        location.href = "app.html";
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.add("show");
      }
    });
