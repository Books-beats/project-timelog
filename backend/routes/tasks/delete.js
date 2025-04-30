var { removeTask } = require("../../models/tasks");

/* DELETE  task */
async function deleteTask(req, res) {
  const id = req.params.task_id;
  try {
    await removeTask(id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
}

module.exports = deleteTask;
