import "../firebase/app.js";
    import { loginEmail, loginGoogle } from "../firebase/auth.js";
    import { continueAsGuest } from "../auth/authentication/guest.js";
    import { initSession } from "../auth/session/session.js";
    import { getProfileByUid } from "../features/profile/profile.service.js";
    initSession();
    const err = document.getElementById("err");
    function show(m) { err.textContent = m; err.classList.add("show"); }

    document.getElementById("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const cred = await loginEmail(document.getElementById("email").value, document.getElementById("password").value);
        const p = await getProfileByUid(cred.user.uid);
        location.href = p?.username ? "app.html" : "onboarding.html";
      } catch (ex) { show(ex.message); }
    });
    document.getElementById("guest").addEventListener("click", async () => {
      try {
        await continueAsGuest();
        location.href = "app.html";
      } catch (ex) { show(ex.message); }
    });
    document.getElementById("google").addEventListener("click", async () => {
      try {
        const cred = await loginGoogle();
        const p = await getProfileByUid(cred.user.uid);
        location.href = p?.username ? "app.html" : "onboarding.html";
      } catch (ex) { show(ex.message); }
    });
