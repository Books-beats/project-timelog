var { updateNewTask } = require("../../models/tasks");

/* UPDATE tasks list with given task id */
const updateTask = async (req, res, next) => {
  const { name, elapsedTime } = req.body;
  const id = req.params.task_id;
  try {
    const task = await updateNewTask(id, name, elapsedTime);
    res.json(task);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
};

module.exports = updateTask;
