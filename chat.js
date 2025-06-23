const nickname = localStorage.getItem("nickname");
if (!nickname) {
  window.location.href = "index.html";
}

const socket = io("https://your-railway-url.up.railway.app"); // Replace later

let localStream;
let peerConnections = {};
let muted = false;

const userList = document.getElementById("userList");
const muteBtn = document.getElementById("muteBtn");

socket.emit("join-room", nickname);

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  localStream = stream;

  muteBtn.onclick = () => {
    muted = !muted;
    localStream.getAudioTracks()[0].enabled = !muted;
    muteBtn.textContent = muted ? "🔇 Unmute" : "🔊 Mute";
  };

  socket.on("user-joined", ({ id, name }) => {
    const pc = new RTCPeerConnection();
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("signal", {
          to: id,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = event => {
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };

    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit("signal", {
        to: id,
        signal: { sdp: offer }
      });
    });

    peerConnections[id] = pc;
    addUser(name);
  });

  socket.on("signal", ({ from, signal }) => {
    let pc = peerConnections[from] || new RTCPeerConnection();

    pc.ontrack = event => {
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("signal", {
          to: from,
          signal: { candidate: event.candidate }
        });
      }
    };

    if (signal.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        if (signal.sdp.type === "offer") {
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
          pc.createAnswer().then(answer => {
            pc.setLocalDescription(answer);
            socket.emit("signal", {
              to: from,
              signal: { sdp: answer }
            });
          });
        }
      });
    } else if (signal.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }

    peerConnections[from] = pc;
  });

  socket.on("update-user-list", (users) => {
    userList.innerHTML = "";
    users.forEach(u => addUser(u));
  });
});

function addUser(name) {
  const li = document.createElement("li");
  li.textContent = name;
  userList.appendChild(li);
}
