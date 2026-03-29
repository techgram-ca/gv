const params = new URLSearchParams(window.location.search);
    const isPaid = params.get("p");

    if (isPaid === "true") {
      document.getElementById("paidSection").classList.remove("hidden");
    }
