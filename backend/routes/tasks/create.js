var { createNewTask } = require("../../models/tasks");

/* CREATE new task */
async function createTask(req, res) {
  const { name } = req.body;
  const elapsedTime = 0;

  try {
    const task = await createNewTask(name, Number(elapsedTime));
    res.status(201).json(task);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
}

module.exports = createTask;
