import "../firebase/app.js";
    import { initSession, onSession } from "../auth/session/session.js";
    import { continueAsGuest } from "../auth/authentication/guest.js";
    initSession();
    onSession((user, profile) => {
      if (user && profile?.username) location.replace("app.html");
    });
    document.getElementById("guest-land")?.addEventListener("click", async () => {
      try {
        await continueAsGuest();
        location.href = "app.html";
      } catch (e) { alert(e.message); }
    });
