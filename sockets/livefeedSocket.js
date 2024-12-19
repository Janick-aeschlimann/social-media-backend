const db = require("../db");
const musicController = require("../controllers/musicController");

const votingTime = 60;
const requestTime = 60;

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
      activeLivefeeds.push({
        livefeedId: livefeedId,
        phase: "idle",
        nextPhaseStart: new Date().getTime(),
      });
      activateLivefeed(livefeedId, io);
    }

    var messages = await db.query(
      "SELECT * FROM livefeedMessages WHERE livefeedId = ? ORDER BY date DESC LIMIT 20",
      [livefeedId]
    );

    const votes = await db.query(
      "SELECT * FROM votes WHERE livefeedId = ? AND userId = ?",
      [livefeedId, socket.user.userId]
    );

    const hasVoted = votes[0] ? true : false;

    messages = await Promise.all(
      messages.map(async (message) => {
        const user = await db.query("SELECT * FROM users WHERE userId = ?", [
          message.userId,
        ]);
        return {
          user: {
            userId: user[0].userId,
            username: user[0].username,
            displayName: user[0].displayName,
          },
          livefeedMessageId: message.livefeedMessageId,
          message: message.message,
          date: message.date,
          hasVoted: hasVoted,
        };
      })
    );

    const requests = await db.query(
      "SELECT * FROM requestedSongs WHERE livefeedId = ?",
      [livefeedId]
    );

    const song = await db.query("SELECT * FROM songs WHERE songId = ?", [
      livefeeds[0].songId,
    ]);

    console.log(song);

    socket.emit("livefeed_init_data", {
      messages: messages,
      livefeed: livefeeds[0],
      requests: requests,
      phase:
        activeLivefeeds.find((livefeed) => livefeed.livefeedId === livefeedId)
          ?.phase || "idle",
      nextPhaseStart:
        activeLivefeeds.find((livefeed) => livefeed.livefeedId === livefeedId)
          ?.nextPhaseStart || new Date().getTime(),
      song: song[0],
    });

    socket.removeAllListeners("livefeed_message");
    socket.removeAllListeners("livefeed_request_song");
    socket.removeAllListeners("livefeed_vote_song");

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

const activateLivefeed = async (livefeedId, io) => {
  cycle(livefeedId, io);
};

const cycle = async (livefeedId, io) => {
  const livefeed = activeLivefeeds.find(
    (livefeed) => livefeed.livefeedId == livefeedId
  );
  livefeed.phase = "request";
  livefeed.nextPhaseStart = new Date().getTime() + requestTime * 1000;
  console.log("Request phase");
  //request phase
  io.to(livefeedId).emit("livefeed_request_phase", {
    votingTime: new Date().getTime() + requestTime * 1000,
  });
  setTimeout(async () => {
    //voting phase

    const requestedSongs = await db.query(
      "SELECT * FROM requestedSongs WHERE livefeedId = ?",
      [livefeedId]
    );
    if (requestedSongs.length == 0) {
      console.log("No songs requested");
      activeLivefeeds.filter((livefeed) => livefeed.livefeedId != livefeedId);
      db.query("UPDATE livefeeds SET songId = NULL WHERE livefeedId = ?", [
        livefeedId,
      ]);
      cycle(livefeedId, io);
      return;
    }
    io.to(livefeedId).emit("livefeed_voting_phase", {
      requestedSongs: requestedSongs,
      playingTime: new Date().getTime() + votingTime * 1000,
    });
    livefeed.phase = "voting";
    livefeed.nextPhaseStart = new Date().getTime() + votingTime * 1000;
    console.log("Voting phase");
    setTimeout(async () => {
      //playing phase
      const playingSong = await countVotes(livefeedId);

      console.log(playingSong);

      const song = await db.query(
        "SELECT * FROM requestedSongs WHERE requestedSongId = ?",
        [playingSong.requestedSongId]
      );

      const response = await db.insert("songs", {
        videoId: song[0].videoId,
        title: song[0].title,
        artist: song[0].artist,
        duration: song[0].duration,
        thumbnailUrl: song[0].thumbnailUrl,
      });
      console.log(response);

      const songInfo = await db.query("SELECT * FROM songs WHERE songId = ?", [
        response[0].insertId,
      ]);
      db.query("DELETE FROM votes WHERE livefeedId = ?", [livefeedId]);
      db.query("DELETE FROM requestedSongs WHERE livefeedId = ?", [livefeedId]);
      db.query("UPDATE livefeeds SET songId = ? WHERE livefeedId = ?", [
        songInfo[0].songId,
        livefeedId,
      ]);
      io.to(livefeedId).emit("livefeed_play_song", {
        song: songInfo[0],
        nextRequest:
          new Date().getTime() +
          (songInfo[0].duration - (requestTime + votingTime)) * 1000,
      });
      console.log("Playing phase", song[0]);
      livefeed.phase = "playing";
      livefeed.nextPhaseStart =
        new Date().getTime() +
        (song[0].duration - (requestTime + votingTime)) * 1000;
      setTimeout(async () => {
        //song finished
        console.log("song almoast finished -> next cycle");
        //if users are still in livefeed after song is played, cycle again else remove livefeed from activeLivefeeds
        if (io.sockets.adapter.rooms.get(livefeedId)?.size > 0) {
          console.log("Next cycle");
          cycle(livefeedId, io);
          return;
        } else {
          activeLivefeeds = activeLivefeeds.filter(
            (livefeed) => livefeed.livefeedId != livefeedId
          );
          db.query("UPDATE livefeeds SET songId = NULL WHERE livefeedId = ?", [
            livefeedId,
          ]);
        }
      }, 1000 * (song[0].duration - (requestTime + votingTime)));
    }, 1000 * votingTime);
  }, 1000 * requestTime);
};

const countVotes = async (livefeedId) => {
  const votes = await db.query(
    "SELECT requestedSongId, COUNT(*) as voteCount FROM votes WHERE livefeedId = ? GROUP BY requestedSongId ORDER BY voteCount DESC LIMIT 1",
    [livefeedId]
  );
  if (votes[0]) {
    return votes[0];
  } else {
    const random = await db.query(
      "SELECT * FROM requestedSongs WHERE livefeedId = ? LIMIT 1",
      [livefeedId]
    );
    return random[0];
  }
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
      socket.emit("error", { status: "error", response: "Already voted" });
    } else {
      await db.insert("votes", {
        userId: senderId,
        livefeedId: livefeedId,
        requestedSongId: requestedSongId,
      });

      const votes = await db.query(
        "SELECT COUNT(*) as voteCount FROM votes WHERE requestedSongId = ?",
        [requestedSongId]
      );

      socket.emit("livefeed_vote_song", {
        votes: votes,
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
    const response = await db.insert("requestedSongs", {
      userId: senderId,
      videoId: videoId,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      livefeedId: livefeedId,
      thumbnailUrl: song.thumbnailUrl,
    });

    console.log(response);

    io.to(livefeedId).emit("livefeed_request_song", {
      userId: senderId,
      videoId: videoId,
      requestedSongId: response[0].insertId,
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
  const response = db.insert("livefeedMessages", {
    userId: senderId,
    livefeedId: livefeed[0].livefeedId,
    message: message,
  });

  const user = await db.query("SELECT * FROM users WHERE userId = ?", [
    senderId,
  ]);

  io.to(livefeed[0].livefeedId).emit("livefeed_message", {
    user: {
      userId: user[0].userId,
      username: user[0].username,
      displayName: user[0].displayName,
    },
    livefeedMessageId: response.insertId,
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
  socket.removeAllListeners("livefeed_request_song");
  socket.removeAllListeners("livefeed_vote_song");
};
