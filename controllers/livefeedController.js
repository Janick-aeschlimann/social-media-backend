const { use } = require("../app");
const db = require("../db");

exports.getLivefeeds = async (req, res) => {
  const page = req.params.page || 0;

  var livefeeds = await db.query("SELECT * FROM livefeeds LIMIT 10 OFFSET ?", [
    page * 10,
  ]);

  const total = await db.query("SELECT COUNT(*) as total FROM livefeeds");

  const totalPages = Number(Math.ceil(total[0].total / 10));

  livefeeds = await Promise.all(
    livefeeds.map(async (livefeed) => {
      const follower = await db.query(
        "SELECT COUNT(followerId) as follower FROM follower WHERE livefeedId = ?",
        [livefeed.livefeedId]
      );
      const user = await db.query("SELECT * FROM users WHERE userId = ?", [
        livefeed.userId,
      ]);
      return {
        livefeedId: livefeed.livefeedId,
        user: {
          userId: user[0].userId,
          username: user[0].username,
          displayName: user[0].displayName,
        },
        name: livefeed.name,
        description: livefeed.description,
        age_restriction: livefeed.age_restriction,
        cooldown: livefeed.cooldown,
        follower: follower[0].follower,
      };
    })
  );

  res.send({
    status: "success",
    response: { page: page, totalPages: totalPages, results: livefeeds },
  });
};

exports.getLivefeed = async (req, res) => {
  const livefeedId = req.params.livefeedId;

  const livefeeds = await db.query(
    "SELECT * FROM livefeeds WHERE livefeedId = ?",
    [livefeedId]
  );

  if (livefeeds[0]) {
    const livefeed = livefeeds[0];
    const follower = await db.query(
      "SELECT COUNT(followerId) as follower FROM follower WHERE livefeedId = ?",
      [livefeed.livefeedId]
    );
    res.send({
      status: "success",
      response: {
        livefeedId: livefeed.livefeedId,
        userId: livefeed.userId,
        name: livefeed.name,
        description: livefeed.description,
        age_restriction: livefeed.age_restriction,
        cooldown: livefeed.cooldown,
        follower: follower[0].follower,
      },
    });
  } else {
    res.status(404).send({ status: "error", response: "livefeed not found" });
  }
};

exports.createLivefeed = async (req, res) => {
  const { name, description, age_restriction, cooldown } = req.body;

  if ((name, description, age_restriction, cooldown) != undefined) {
    await db.insert("livefeeds", {
      userId: req.user.userId,
      name: name,
      description: description,
      age_restriction: age_restriction,
      cooldown: cooldown,
    });
    res.send({ status: "success" });
  } else {
    res.status(400).send({
      status: "error",
      response: "please specify name, description, age_restriction, cooldown",
    });
  }
};

exports.editLivefeed = async (req, res) => {
  const userId = req.user.userId;
  const livefeedId = req.params.livefeedId;
  const { name, description, age_restriction, cooldown } = req.body;

  if ((name, description, age_restriction, cooldown) != undefined) {
    const livefeeds = await db.query(
      "SELECT * FROM livefeeds WHERE livefeedId = ?",
      [livefeedId]
    );

    if (livefeeds[0]) {
      if (livefeeds[0].userId == userId) {
        db.query(
          "UPDATE livefeeds SET name = ?, description = ?, age_restriction = ?, cooldown = ? WHERE livefeedId = ?",
          [name, description, age_restriction, cooldown, livefeedId]
        );
        res.send({ status: "success" });
      } else {
        res.status(403).send({ status: "error", response: "Forbidden" });
      }
    } else {
      res.status(404).send({ status: "error", response: "livefeed not found" });
    }
  } else {
    res.status(400).send({
      status: "error",
      response: "please specify name, description, age_restriction, cooldown",
    });
  }
};

exports.deleteLivefeed = async (req, res) => {
  const userId = req.user.userId;
  const livefeedId = req.params.livefeedId;

  const livefeeds = await db.query(
    "SELECT * FROM livefeeds WHERE livefeedId = ?",
    [livefeedId]
  );

  if (livefeeds[0]) {
    if (livefeeds[0].userId == userId) {
      db.query("DELETE FROM livefeeds WHERE livefeedId = ?", [livefeedId]);
      res.send({ status: "success" });
    } else {
      res.status(403).send({ status: "error", response: "Forbidden" });
    }
  } else {
    res.status(404).send({ status: "error", response: "livefeed not found" });
  }
};

exports.follow = async (req, res) => {
  const livefeedId = req.params.livefeedId;
  const userId = req.user.userId;

  const livefeeds = await db.query(
    "SELECT * FROM livefeeds WHERE livefeedId = ?",
    [livefeedId]
  );

  if (livefeeds[0]) {
    const follows = await db.query(
      "SELECT * FROM follower WHERE userId = ? AND livefeedId = ?",
      [userId, livefeedId]
    );
    if (follows[0]) {
      res.status(409).send({ status: "error", response: "already following" });
    } else {
      db.insert("follower", { userId: userId, livefeedId: livefeedId });
      res.send({ status: "success" });
    }
  } else {
    res.status(404).send({ status: "error", response: "livefeed not found" });
  }
};

exports.unfollow = async (req, res) => {
  const livefeedId = req.params.livefeedId;
  const userId = req.user.userId;

  const livefeeds = await db.query(
    "SELECT * FROM livefeeds WHERE livefeedId = ?",
    [livefeedId]
  );

  if (livefeeds[0]) {
    const follows = await db.query(
      "SELECT * FROM follower WHERE userId = ? AND livefeedId = ?",
      [userId, livefeedId]
    );
    if (follows[0]) {
      db.query("DELETE FROM follower WHERE followerId = ?", [
        follows[0].followerId,
      ]);
      res.send({ status: "success" });
    } else {
      res.status(404).send({ status: "error", response: "not following" });
    }
  } else {
    res.status(404).send({ status: "error", response: "livefeed not found" });
  }
};
