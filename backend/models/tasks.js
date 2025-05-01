const db = require("./index");

function createNewTask(name, elapsedTime) {
  return db.one(
    'INSERT INTO tasks (title, time_elapsed) VALUES (${name}, ${elapsedTime}) RETURNING id, title as name, time_elapsed as "elapsedTime"',
    { name, elapsedTime }
  );
}

function listTasks() {
  return db.any(
    'SELECT id, title as name, time_elapsed as "elapsedTime" FROM tasks'
  );
}

function updateNewTask(id, name, elapsedTime) {
  const fields = [];
  const values = { id };

  if (name !== undefined) {
    fields.push("title = ${name}");
    values.name = name;
  }

  if (elapsedTime !== undefined) {
    fields.push("time_elapsed = ${elapsedTime}");
    values.elapsedTime = elapsedTime;
  }

  if (fields.length === 0) {
    throw new Error("No fields to update.");
  }

  const query = `
    UPDATE tasks
    SET ${fields.join(", ")}
    WHERE id = ${id}
    RETURNING id, title as name, time_elapsed as "elapsedTime"
  `;

  return db.one(query, values);
}

function removeTask(id) {
  return db.none("DELETE FROM tasks WHERE id = $1", [id]);
}
function filterTasks(id) {
  if (id === "all") {
    return db.any(
      'SELECT id, title AS name, time_elapsed AS "elapsedTime" FROM tasks'
    );
  } else {
    return db.any(
      'SELECT id, title AS name, time_elapsed AS "elapsedTime" FROM tasks WHERE id = $1',
      [id]
    );
  }
}

module.exports = {
  createNewTask,
  listTasks,
  updateNewTask,
  removeTask,
  filterTasks,
};
