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

    if (
      !activeLivefeeds.some((livefeed) => livefeed.livefeedId === livefeedId)
    ) {
      activeLivefeeds.push({ livefeedId: livefeedId, phase: "idle" });
      activateLivefeed(livefeedId, io);
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
  cycle(livefeedId);
};

const cycle = async (livefeedId) => {
  const livefeed = activeLivefeeds.find(
    (livefeed) => livefeed.livefeedId == livefeedId
  );
  livefeed.phase = "request";
  console.log("Request phase");
  //request phase
  setTimeout(async () => {
    //voting phase
    const requestedSongs = await db.query(
      "SELECT * FROM requestedSongs WHERE livefeedId = ?",
      [livefeedId]
    );
    if (requestedSongs.length == 0) {
      console.log("No songs requested");
      activeLivefeeds.filter((livefeed) => livefeed.livefeedId != livefeedId);
      return;
    }
    livefeed.phase = "voting";
    console.log("Voting phase");
    setTimeout(async () => {
      //playing phase
      const playingSong = await countVotes(livefeedId);
      await db.query("DELETE FROM songs WHERE livefeedId = ?", [livefeedId]);
      const response = await db.insert("songs", {
        videoId: playingSong.videoId,
        title: playingSong.title,
        artist: playingSong.artist,
        duration: playingSong.duration,
        thumbnailUrl: playingSong.thumbnailUrl,
      });
      db.query("DELETE FROM votes WHERE livefeedId = ?", [livefeedId]);
      db.query("DELETE FROM requestedSongs WHERE livefeedId = ?", [livefeedId]);
      db.query("UPDATE livefeeds SET songId = ? WHERE livefeedId = ?", [
        response.insertId,
        livefeedId,
      ]);
      //send play_song event to client
      console.log("Playing phase", duration);
      livefeed.phase = "playing";
      setTimeout(async () => {
        //song finished
        console.log("song almoast finished -> next cycle");
        //if users are still in livefeed after song is played, cycle again else remove livefeed from activeLivefeeds
        const users = db.query(
          "SELECT * FROM activeUsers WHERE livefeedId = ?",
          [livefeedId]
        );
        if (users[0]) {
          cycle(livefeedId);
        } else {
          activeLivefeeds.filter(
            (livefeed) => livefeed.livefeedId != livefeedId
          );
          const songId = await db.query(
            "SELECT songId FROM livefeeds WHERE livefeedId = ?",
            [livefeedId]
          );
          if (songId[0] && songId[0].songId) {
            await db.query("DELETE FROM songs WHERE songId = ?", [
              songId[0].songId,
            ]);
          }
          db.query("UPDATE livefeeds SET songId = NULL WHERE livefeedId = ?", [
            livefeedId,
          ]);
        }
      }, 1000 * (playingSong.duration - 20));
    }, 1000 * 10);
  }, 1000 * 10);
};

const countVotes = async (livefeedId) => {
  const votes = await db.query(
    "SELECT requestedSongId, COUNT(*) as voteCount FROM votes WHERE livefeedId = ? GROUP BY requestedSongId ORDER BY voteCount DESC LIMIT 1",
    [livefeedId]
  );
  return votes[0];
};

const handleLivefeedVoteSong = async (data, socket, io) => {
  const senderId = socket.user.userId;
  const requestedSongId = data.requestedSongId;

  const activeUsers = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [senderId]
  );

  const livefeedId = activeUsers[0].livefeedId;

  if (
    activeLivefeeds.find((livefeed) => livefeed.livefeedId == livefeedId)
      .phase != "voting"
  ) {
    socket.emit("error", { status: "error", response: "Not in voting phase" });
    return;
  }

  console.log(requestedSongId);

  const requestedSong = await db.query(
    "SELECT * FROM requestedSongs WHERE requestedSongId = ? AND livefeedId = ?",
    [requestedSongId, livefeedId]
  );

  console.log(requestedSong);

  if (requestedSong[0]) {
    const vote = await db.query(
      "SELECT * FROM votes WHERE userId = ? AND livefeedId = ?",
      [senderId, livefeedId]
    );

    if (vote[0]) {
      await db.query("UPDATE votes SET requestedSongId = ? WHERE voteId = ?", [
        requestedSongId,
        vote[0].voteId,
      ]);
      const votes = await db.query(
        "SELECT requestedSongId, COUNT(*) FROM votes WHERE livefeedId = ? GROUP BY requestedSongId",
        [livefeedId]
      );
      socket.emit("livefeed_vote_song", { votes: votes });
    } else {
      await db.insert("votes", {
        userId: senderId,
        livefeedId: livefeedId,
        requestedSongId: requestedSongId,
      });
    }
  } else {
    socket.emit("error", { status: "error", response: "Song not found" });
    return;
  }
};

const handleLivefeedRequestSong = async (data, socket, io) => {
  const senderId = socket.user.userId;
  const videoId = data.videoId;

  const activeUsers = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [senderId]
  );

  const livefeedId = activeUsers[0].livefeedId;

  console.log(livefeedId);

  if (
    activeLivefeeds.find((livefeed) => livefeed.livefeedId == livefeedId)
      .phase != "request"
  ) {
    socket.emit("error", { status: "error", response: "Not in request phase" });
    return;
  }

  const requestedSongs = await db.query(
    "SELECT * FROM requestedSongs WHERE livefeedId = ? AND videoId = ?",
    [livefeedId, videoId]
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
      livefeedId: livefeedId,
      thumbnailUrl: song.thumbnailUrl,
    });

    io.to(livefeedId).emit("livefeed_request_song", {
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
