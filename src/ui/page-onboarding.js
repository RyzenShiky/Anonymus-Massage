import "/src/firebase/app.js";
    import { initSession, whenReady, getUser } from "/src/auth/session/session.js";
    import { createOrUpdateProfile } from "/src/features/profile/profile.service.js";
    import { isValidUsername, toUsername, isReservedUsername } from "/src/core/utilities/slug.js";
    initSession();
    whenReady().then(({ user }) => { if (!user) location.href = "login.html"; });
    document.getElementById("go").addEventListener("click", async () => {
      const username = toUsername(document.getElementById("u").value);
      if (isReservedUsername(username)) {
        err.textContent = "Username reserved"; err.classList.add("show"); return;
      }
      if (!isValidUsername(username)) {
        err.textContent = "Invalid username"; err.classList.add("show"); return;
      }
      try {
        await createOrUpdateProfile(getUser().uid, { username, displayName: username });
        location.href = "app.html";
      } catch (ex) { err.textContent = ex.message; err.classList.add("show"); }
    });
