function joinChat() {
  const name = document.getElementById("nickname").value.trim();
  if (name) {
    localStorage.setItem("nickname", name);
    window.location.href = "chat.html";
  } else {
    alert("Please enter a nickname.");
  }
}
