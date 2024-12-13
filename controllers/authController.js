const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();
const db = require("../db");
const hashSaltRounds = 10;
const bcrypt = require("bcrypt");

const authorization = async (username, password) => {
  const hashedPwd = await db.query(
    "SELECT passwd FROM users WHERE username = ?",
    [username]
  );

  if (await bcrypt.compare(password, hashedPwd[0].passwd)) {
    console.log("true");

    return true;
  } else {
    return false;
  }
};

const generateAccessToken = async (username) => {
  return await jwt.sign(
    { username: username },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    if (await authorization(username, password)) {
      const access_token = await generateAccessToken(username);

      res.send({ token: access_token });
    } else {
      res.send("wrong password or username");
    }
  } else {
    res.send("no username or password given");
  }
};

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (username && email && password) {
    let result = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (!result[0]) {
      let hashedPwd = await bcrypt.hash(password, hashSaltRounds);
      db.insert("users", {
        username: username,
        email: email,
        passwd: hashedPwd,
      });
      res.send("success");
    } else {
      res.send({ error: "user already exists" });
    }
  } else {
    res.send("err");
  }
};
