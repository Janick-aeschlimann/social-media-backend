const mysql = require("mysql2/promise.js");

const con = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  database: "socialMediadb",
});

async function query(query, fields) {
  const [results] = await con.query(query, fields);
  return results;
}

async function getAll(table) {
  const [results] = await con.query(`SELECT * FROM ${table}`);
  return results;
}

async function insert(table, data) {
  let fields = Object.keys(data);
  let values = Object.values(data);
  await con.query(
    `INSERT INTO \`${table}\` (\`${fields.join("`, `")}\`) VALUES (${fields
      .map(() => "?")
      .join(", ")});`,
    values
  );
}

module.exports = { query, getAll, insert };
