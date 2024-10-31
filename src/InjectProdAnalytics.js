if (process.env.NODE_ENV === "production") {
  const script = document.createElement("script");
  script.defer = true;
  script.setAttribute("data-domain", "eieio.games");
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}
