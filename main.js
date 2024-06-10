const url = 'https://webrtc-500c0-default-rtdb.asia-southeast1.firebasedatabase.app/call';
let username = prompt("enter username: ");
const PRE = "DELTA"
const SUF = "MEET"
var room_id;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var currentPeer = null
var screenSharing = false;

// Hàm gửi yêu cầu POST đến một URL
function sendPostRequest(url, data, callback) {
  // Tạo một đối tượng XMLHttpRequest
  var xhr = new XMLHttpRequest();

  // Thiết lập phương thức và URL yêu cầu
  xhr.open("POST", url, true);

  // Thiết lập tiêu đề của yêu cầu nếu cần
  xhr.setRequestHeader("Content-Type", "application/json");

  // Xử lý sự kiện khi yêu cầu hoàn thành
  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      // Gọi hàm callback với kết quả khi yêu cầu hoàn thành
      callback(xhr.responseText);
    }
  };

  // Chuyển đổi dữ liệu thành chuỗi JSON (nếu có)
  var jsonData = JSON.stringify(data);

  // Gửi yêu cầu với dữ liệu đã chuyển đổi
  xhr.send(jsonData);
}

function sendGetRequest(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);

  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      if (xhr.status == 200) {
        callback(xhr.responseText);
      } else {
        console.error("Error:", xhr.status);
      }
    }
  };

  xhr.send();
}

function createRoom() {
  console.log("Creating Room")
  let room = document.getElementById("room-input").value;
  if (room == " " || room == "") {
    alert("Please enter room number");
    return;
  }
  const newRoom = {};

  newRoom.room = room;
  newRoom.username = username;
  // Gọi hàm sendPostRequest với thông tin cần thiết
  sendPostRequest(url + ".json", newRoom, function (response) {
    // Xử lý kết quả trả về từ API ở đây
    alert("joined: " + response)
  });
  room_id = PRE + room + SUF;
  peer = new Peer(room_id)
  peer.on('open', (id) => {
    console.log("Peer Connected with ID: ", id)
    hideModal()
    getUserMedia({ video: true, audio: true }, (stream) => {
      local_stream = stream;
      setcurrentPeer(local_stream)
    }, (err) => {
      console.log(err)
    })
    notify("Waiting for peer to join.")
  })
  peer.on('call', (call) => {
    console.log("llllllllllllll")
    call.answer(local_stream);
    call.on('stream', (stream) => {
      setRemoteStream(stream)
    })
    currentPeer = call;
  })
}

function setcurrentPeer(stream) {

  let video = document.getElementById("local-video");
  video.srcObject = stream;
  video.muted = true;
  video.play();
}
function setRemoteStream(stream) {

  let video = document.getElementById("remote-video");

  video.srcObject = stream;
  // Kiểm tra xem có lỗi khi thiết lập stream không
  if (video.srcObject !== stream) {
    alert("BI chan")
  }


  video.play()


}

function hideModal() {
  document.getElementById("entry-modal").hidden = true
}

function notify(msg) {
  let notification = document.getElementById("notification")
  notification.innerHTML = msg
  notification.hidden = false
  setTimeout(() => {
    notification.hidden = true;
  }, 3000)
}

function joinRoom() {
  console.log("Joining Room")
  let room = document.getElementById("room-input").value;
  if (room == " " || room == "") {
    alert("Please enter room number");
    return;
  }
  let currentRoom = null;
  sendGetRequest(url + ".json", function (response) {
    var result = JSON.parse(response);
    console.log(result)
    // Lặp qua các khóa trong đối tượng JSON
    for (var key in result) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        var roomInfo = result[key];
        //alert(room + ":" + roomInfo.room + "=" + (room == roomInfo.room))
        if (room == roomInfo.room)
          currentRoom = roomInfo.room;
      }
    }

    if (currentRoom == null) {
      alert("Chưa có phòng này!" + currentRoom);
      return;
    }

    alert(currentRoom);
    const newRoom = {};
    newRoom.room = room;
    newRoom.username = username;
    // Gọi hàm sendPostRequest với thông tin cần thiết
    sendPostRequest(url + ".json", newRoom, function (response) {
      // Xử lý kết quả trả về từ API ở đây
      alert("joined: " + response)
    });

    room_id = PRE + room + SUF;
    hideModal()
    peer = new Peer()
    peer.on('open', (id) => {
      console.log("Connected with Id: " + id)
      getUserMedia({ video: true, audio: true }, (stream) => {
        local_stream = stream;
        setcurrentPeer(local_stream)
        notify("Joining peer")
        let call = peer.call(room_id, stream)
        call.on('stream', (stream) => {
          setRemoteStream(stream);
        })
        currentPeer = call;
      }, (err) => {
        console.log(err)
      })

    })
  });
}

function startScreenShare() {
  if (screenSharing) {
    stopScreenSharing()
  }
  navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
    screenStream = stream;
    let videoTrack = screenStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      stopScreenSharing()
    }
    if (peer) {
      let sender = currentPeer.peerConnection.getSenders().find(function (s) {
        return s.track.kind == videoTrack.kind;
      })
      sender.replaceTrack(videoTrack)
      screenSharing = true
    }
    console.log(screenStream)
  })
  document.querySelector("#to-share-screen").style.display = "none";
  document.querySelector("#stop-share-screen").style.display = "block";
}

function stopScreenSharing() {
  if (!screenSharing) return;
  let videoTrack = local_stream.getVideoTracks()[0];
  if (peer) {
    let sender = currentPeer.peerConnection.getSenders().find(function (s) {
      return s.track.kind == videoTrack.kind;
    })
    sender.replaceTrack(videoTrack)
  }
  screenStream.getTracks().forEach(function (track) {
    track.stop();
  });
  screenSharing = false;
  document.querySelector("#to-share-screen").style.display = "block";
  document.querySelector("#stop-share-screen").style.display = "none";
}

function turnOffCamera() {
  let videoTrack = local_stream.getVideoTracks()[0];

  // Kiểm tra xem videoTrack có tồn tại không
  if (videoTrack) {
    // Tạm dừng video track
    videoTrack.enabled = false;

    // Lặp qua tất cả các sender trong peerConnection của currentPeer
    currentPeer.peerConnection.getSenders().forEach((sender) => {
      // Kiểm tra xem sender có loại track giống với videoTrack không
      if (sender.track && sender.track.kind === videoTrack.kind) {
        // Thay thế track của sender bằng videoTrack
        sender.replaceTrack(videoTrack);
      }
    });
  } else {
    console.error('Không tìm thấy track video trong local_stream.');
  }

  document.querySelector("#off-camera").style.display = "none";
  document.querySelector("#on-camera").style.display = "block";
}

function turnOnCamera() {
  // Lấy track video từ local_stream
  let videoTrack = local_stream.getVideoTracks()[0];

  // Kiểm tra xem videoTrack có tồn tại không
  if (videoTrack) {
    // Bật lại video track
    videoTrack.enabled = true;

    // Lặp qua tất cả các sender trong peerConnection của currentPeer
    currentPeer.peerConnection.getSenders().forEach((sender) => {
      // Kiểm tra xem sender có loại track giống với videoTrack không
      if (sender.track && sender.track.kind === videoTrack.kind) {
        // Thay thế track của sender bằng videoTrack
        sender.replaceTrack(videoTrack);
      }
    });
  } else {
    console.error('Không tìm thấy track video trong local_stream.');
  }

  document.querySelector("#off-camera").style.display = "block";
  document.querySelector("#on-camera").style.display = "none";
}

function turnOnMicro() {
  // Lấy track âm thanh từ local_stream
  let audioTrack = local_stream.getAudioTracks()[0];

  // Kiểm tra xem audioTrack có tồn tại không
  if (audioTrack) {
    // Bật lại audio track
    audioTrack.enabled = true;

    // Lặp qua tất cả các sender trong peerConnection của currentPeer
    currentPeer.peerConnection.getSenders().forEach((sender) => {
      // Kiểm tra xem sender có loại track giống với audioTrack không
      if (sender.track && sender.track.kind === audioTrack.kind) {
        // Thay thế track của sender bằng audioTrack
        sender.replaceTrack(audioTrack);
      }
    });
  } else {
    console.error('Không tìm thấy track âm thanh trong local_stream.');
  }
  document.querySelector("#off-mic").style.display = "block";
  document.querySelector("#on-mic").style.display = "none";
}


function turnOffMicro() {
  // Lấy track âm thanh từ local_stream
  let audioTrack = local_stream.getAudioTracks()[0];

  // Kiểm tra xem audioTrack có tồn tại không
  if (audioTrack) {
    // Tạm dừng audio track
    audioTrack.enabled = false;

    // Lặp qua tất cả các sender trong peerConnection của currentPeer
    currentPeer.peerConnection.getSenders().forEach((sender) => {
      // Kiểm tra xem sender có loại track giống với audioTrack không
      if (sender.track && sender.track.kind === audioTrack.kind) {
        // Thay thế track của sender bằng audioTrack
        sender.replaceTrack(audioTrack);
      }
    });
  } else {
    console.error('Không tìm thấy track âm thanh trong local_stream.');
  }
  document.querySelector("#off-mic").style.display = "none";
  document.querySelector("#on-mic").style.display = "block";
}