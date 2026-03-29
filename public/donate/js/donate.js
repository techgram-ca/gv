const isAnonymous = document.getElementById("is_anonymous");
const nameInput = document.querySelector("input[name='name']");
const emailInput = document.querySelector("input[name='email']");

isAnonymous.addEventListener("change", () => {
  if (isAnonymous.checked) {
    // Disable & clear inputs
    nameInput.value = "";
    emailInput.value = "";
    nameInput.disabled = true;
    emailInput.disabled = true;
    nameInput.removeAttribute("required");
    emailInput.removeAttribute("required");
  } else {
    // Enable inputs & make required
    nameInput.disabled = false;
    emailInput.disabled = false;
    nameInput.setAttribute("required", "required");
    emailInput.setAttribute("required", "required");
  }
});

const buttons = document.querySelectorAll(".amount-btn");
    const customAmount = document.getElementById("customAmount");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        // Clear all highlights
        buttons.forEach(b => b.classList.remove("bg-black", "text-white", "border-white"));

        // Highlight selected
        btn.classList.add("bg-black", "text-white", "border-white");

        // Set value
        customAmount.value = btn.dataset.amount;
      });
    });

    // If user types custom amount, remove highlight from preset buttons
    customAmount.addEventListener("input", () => {
      buttons.forEach(b => b.classList.remove("bg-black", "text-white", "border-white"));
    });

const form = document.getElementById("donateForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isAnonymous = form.is_anonymous.checked;
  const data = {
    name: isAnonymous ? "Anonymous" : form.name.value,
    email: isAnonymous ? "anonymous@gurbanivyakhya.com" : form.email.value,
    amount: Number(form.customAmount.value),
    is_anonymous: isAnonymous
  };

  const res = await fetch("/api/donate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const { url } = await res.json();
  window.location.href = url; // redirect to Stripe Checkout
});