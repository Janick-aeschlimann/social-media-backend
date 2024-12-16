const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();
const db = require("../db");
const hashSaltRounds = 10;
const bcrypt = require("bcrypt");

const authorization = async (username, password) => {
  const hashedPwd = await db.query(
    "SELECT password FROM users WHERE username = ?",
    [username]
  );

  if (hashedPwd[0]) {
    if (await bcrypt.compare(password, hashedPwd[0].password)) {
      console.log("true");

      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const generateAccessToken = async (userId) => {
  return await jwt.sign({ userId: userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).send({
      status: "error",
      response: "username or password not specified",
    });
  } else {
    if (await authorization(username, password)) {
      const user = await db.query(
        "SELECT userId FROM users WHERE username = ?",
        [username]
      );

      const access_token = await generateAccessToken(user[0].userId);

      res.send({ status: "success", token: access_token });
    } else {
      res.status(401).send({
        status: "error",
        response: "username and password combination doesnt match",
      });
    }
  }
};

exports.register = async (req, res) => {
  const { email, username, displayName, birthDate, password } = req.body;
  if (!email || !username || !displayName || !birthDate || !password) {
    res.status(400).send({
      status: "error",
      response:
        "please specify email, username, displayName, birthDate (YYYY-MM-DD), password",
    });
  } else {
    let result = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (!result[0]) {
      let hashedPwd = await bcrypt.hash(password, hashSaltRounds);
      db.insert("users", {
        email: email,
        username: username,
        displayName: displayName,
        birthDate: birthDate,
        password: hashedPwd,
      });
      res.send({ status: "success" });
    } else {
      res
        .status(409)
        .send({ status: "error", response: "user already exists" });
    }
  }
};
