var { filterTasks } = require("../../models/tasks");

/* DELETE  task */
async function filter(req, res) {
  const id = req.params.task_id;
  try {
    const data = await filterTasks(id);
    res.status(200).json({ data });
  } catch (err) {
    console.error("Error filtering tasks:", err);
    res.status(500).json({ error: "Failed to filter " });
  }
}

module.exports = filter;
