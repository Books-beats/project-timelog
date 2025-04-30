var createTask = require("./create");
var listAllTasks = require("./list");
var updateTask = require("./update");
var deleteTask = require("./delete");

var express = require("express");
var router = express.Router();

router.post("/", createTask);
router.get("/", listAllTasks);
router.put("/:task_id", updateTask);
router.delete("/:task_id", deleteTask);

module.exports = router;
