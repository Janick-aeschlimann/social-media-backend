const db = require("../db");
const musicController = require("../controllers/musicController");

const activeLivefeeds = [];

exports.joinLivefeed = async (data, socket, io) => {
  const livefeedId = data.livefeedId;

  const livefeeds = await db.query(
    "SELECT * FROM livefeeds WHERE livefeedId = ?",
    [livefeedId]
  );

  const activeUsers = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [socket.user.userId]
  );

  if (activeUsers[0]) {
    if (activeUsers[0].livefeedId != null) {
      socket.emit("error", {
        status: "error",
        response: "You are already in this livefeed",
      });
      return;
    }
  }

  if (livefeeds[0]) {
    await db.query("UPDATE activeUsers SET livefeedId = ? WHERE userId = ?", [
      livefeedId,
      socket.user.userId,
    ]);
    socket.join(livefeedId);
    socket.livefeedId = livefeedId;

    if (!activeLivefeeds.includes(livefeedId)) {
      activeLivefeeds.push({ livefeedId: livefeedId, phase: "idle" });
    }

    const messages = await db.query(
      "SELECT * FROM livefeedMessages WHERE livefeedId = ? ORDER BY date DESC LIMIT 20",
      [livefeedId]
    );
    const requests = await db.query(
      "SELECT * FROM requestedSongs WHERE livefeedId = ?",
      [livefeedId]
    );

    socket.emit("livefeed_init_data", {
      messages: messages,
      livefeed: livefeeds[0],
      requests: requests,
    });

    socket.removeAllListeners("livefeed_message");

    socket.on("livefeed_message", (data) =>
      handleLivefeedMessage(data, socket, io)
    );

    socket.on("livefeed_request_song", (data) =>
      handleLivefeedRequestSong(data, socket, io)
    );

    socket.on("livefeed_vote_song", (data) =>
      handleLivefeedVoteSong(data, socket, io)
    );
  } else {
    socket.emit("error", { status: "error", response: "livefeed not found" });
  }
};

const activateLivefeed = async (livefeedId) => {
  const livefeed = activeLivefeeds.find(
    (livefeed) => livefeed.livefeedId == livefeedId
  );
  if (livefeed) {
    livefeed.phase = "request";
  }
  await setTimeout(() => {}, 1000 * 10);
  livefeed.phase = "voting";
  await setTimeout(() => {}, 1000 * 10);
  livefeed.phase = "playing";
};

const handleLivefeedVoteSong = async (data, socket, io) => {
  const senderId = socket.user.userId;
  const requestedSongId = data.requestedSongId;

  if (
    activeLivefeeds.find((livefeed) => livefeed.livefeedId == socket.livefeedId)
      .phase != "voting"
  ) {
    socket.emit("error", { status: "error", response: "Not in voting phase" });
    return;
  }

  const requestedSong = await db.query(
    "SELECT * FROM requestedSongs WHERE requestedSongId = ? AND livefeedId = ?",
    [requestedSongId, socket.livefeedId]
  );

  if (!requestedSong[0]) {
    socket.emit("error", { status: "error", response: "Song not found" });
    return;
  }

  const vote = await db.query(
    "SELECT * FROM votes WHERE userId = ? AND livefeedId = ?",
    [senderId, socket.livefeedId]
  );

  if (vote[0]) {
    await db.query("UPDATE votes SET requestedSongId = ? WHERE voteId = ?", [
      requestedSongId,
      vote[0].voteId,
    ]);
  } else {
    await db.insert("votes", {
      userId: senderId,
      livefeedId: socket.livefeedId,
      requestedSongId: requestedSongId,
    });
  }
};

const handleLivefeedRequestSong = async (data, socket, io) => {
  const senderId = socket.user.userId;
  const videoId = data.videoId;

  if (
    activeLivefeeds.find((livefeed) => livefeed.livefeedId == socket.livefeedId)
      .phase != "request"
  ) {
    socket.emit("error", { status: "error", response: "Not in request phase" });
    return;
  }

  const requestedSongs = await db.query(
    "SELECT * FROM requestedSongs WHERE livefeedId = ? AND videoId = ?",
    [socket.livefeedId, videoId]
  );

  if (requestedSongs[0]) {
    socket.emit("error", {
      status: "error",
      response: "Song has already been requested",
    });
    return;
  }

  const song = await musicController.getSong(videoId);

  if (song != null) {
    await db.insert("requestedSongs", {
      userId: senderId,
      videoId: videoId,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      livefeedId: socket.livefeedId,
      thumbnailUrl: song.thumbnailUrl,
    });

    io.to(socket.livefeedId).emit("livefeed_request_song", {
      userId: senderId,
      videoId: videoId,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      thumbnailUrl: song.thumbnailUrl,
    });
  } else {
    socket.emit("error", { status: "error", response: "Song not found" });
  }
};

const handleLivefeedMessage = async (data, socket, io) => {
  const senderId = socket.user.userId;
  const message = data.message;

  const livefeed = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [senderId]
  );

  if (message.length > 255) {
    socket.emit("error", {
      status: "error",
      response: "Message is too long",
    });
    return;
  }
  if (message.length < 1) {
    socket.emit("error", {
      status: "error",
      response: "Message is too short",
    });
    return;
  }

  const lastMessageTime = await db.query(
    "SELECT * FROM livefeedMessages WHERE userId = ? ORDER BY date DESC LIMIT 1",
    [senderId]
  );

  if (lastMessageTime[0]) {
    if (new Date() - lastMessageTime[0].date < 1000 * livefeed[0].cooldown) {
      const time = new Date() - lastMessageTime[0].date;
      socket.emit("cooldown", {
        nextMessage: livefeed[0].cooldown * 1000 - time,
      });
      return;
    }
  }
  db.insert("livefeedMessages", {
    userId: senderId,
    livefeedId: livefeed[0].livefeedId,
    message: message,
  });

  io.to(livefeed[0].livefeedId).emit("livefeed_message", {
    userId: senderId,
    message: message,
    date: new Date(),
  });
};

exports.leaveLivefeed = async (socket, io) => {
  const livefeed = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [socket.user.userId]
  );
  if (livefeed[0].livefeedId == null) {
    socket.emit("error", {
      status: "error",
      response: "You are not in a livefeed",
    });
    return;
  }
  await db.query("UPDATE activeUsers SET livefeedId = NULL WHERE userId = ?", [
    socket.user.userId,
  ]);

  socket.leave(livefeed[0].livefeedId);
  socket.removeAllListeners("livefeed_message");
};
