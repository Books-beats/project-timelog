var { filterTasks } = require("../../models/tasks");

/* FILTER  task */
async function filter(req, res) {
  console.log(req);
  const search = req.query.search;
  console.log("ksjfr", search);
  try {
    console.log(search);
    const data = await filterTasks(search);
    console.log(data);
    res.status(200).json(data);
  } catch (err) {
    console.error("Error filtering tasks:", err);
    res.status(500).json({ error: "Failed to filter " });
  }
}

module.exports = filter;
