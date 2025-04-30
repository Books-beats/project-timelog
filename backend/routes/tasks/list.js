var { listTasks } = require("../../models/tasks");

/* GET tasks */
const listAllTasks = async (req, res, next) => {
  try {
    const tasks = await listTasks();
    res.status(200).json(tasks);
    return;
  } catch (err) {
    console.error("Error listing tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

module.exports = listAllTasks;
