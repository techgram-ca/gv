document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("confirm-btn");
  const message = document.getElementById("message");

  // Get token from URL
  const pathParts = window.location.pathname.split("/");
  const token = pathParts[pathParts.length - 1];

  if (!token) {
    message.textContent = "Invalid unsubscribe link.";
    btn.disabled = true;
    return;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    message.textContent = "Processing...";

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        message.textContent = "You have unsubscribed successfully 🙏";
      } else {
        message.textContent = data.message || "Failed to unsubscribe.";
      }
    } catch (err) {
      console.error(err);
      message.textContent = "An error occurred. Try again later.";
    }
  });
});