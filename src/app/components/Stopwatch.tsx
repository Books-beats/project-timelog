"use client";

import { useState } from "react";
import { FaPlay } from "react-icons/fa";
import { FaCirclePause } from "react-icons/fa6";
import { RiResetLeftFill } from "react-icons/ri";
import { RiDeleteBin6Line } from "react-icons/ri";

const Stopwatch = ({ id, removeProject, updateProject, timeElapsed }) => {
  const handleDelete = () => {
    removeProject(id);
  };

  const [startDateString, setStartDateString] = useState<string>("");
  let elapsedPausedTime = 0;
  const [stopwatchInterval, setStopwatchInterval] = useState<any>();
  const [isRunning, setIsRunning] = useState(false);

  function startStopwatch() {
    const today = new Date();
    let timeParts = timeElapsed.split(":");
    timeParts = [
      today.getHours() - timeParts[0],
      today.getMinutes() - timeParts[1],
      today.getSeconds() - timeParts[2],
    ];
    console.log(timeParts);
    let date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      timeParts[0],
      timeParts[1],
      timeParts[2]
    );
    setStartDateString(date.toISOString());

    function pad(number) {
      return (number < 10 ? "0" : "") + number;
    }

    function updateStopwatch() {
      const currentDate = new Date();
      var currentTime = currentDate.getTime();
      var elapsedTime = currentTime - date.getTime();
      console.log({ elapsedTime, currentDate, date });
      var seconds = Math.floor(elapsedTime / 1000) % 60;
      var minutes = Math.floor(elapsedTime / 1000 / 60) % 60;
      var hours = Math.floor(elapsedTime / 1000 / 60 / 60);
      var displayTime = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
      updateProject(displayTime, id);
      document.getElementById(`${id}`).innerHTML = displayTime;
    }

    let interval = setInterval(updateStopwatch, 1000);
    setStopwatchInterval(interval);
    setIsRunning(true);
  }

  function pauseStopwatch() {
    if (isRunning) {
      clearInterval(stopwatchInterval);
      elapsedPausedTime =
        new Date().getTime() - new Date(startDateString).getTime();
      setIsRunning(false);
    }
  }

  function stopStopwatch() {
    clearInterval(stopwatchInterval);
    elapsedPausedTime =
      new Date().getTime() - new Date(startDateString).getTime();
    setIsRunning(false);
    elapsedPausedTime = 0;
    document.getElementById(`${id}`).innerHTML = "00:00:00";
    console.log("stop");
    updateProject("00:00:00", id);
  }

  function resetStopwatch() {
    stopStopwatch();
  }

  return (
    <>
      <div
        id={id}
        style={{
          width: "30%",
          padding: "1rem",
          fontSize: "xx-large",
          color: " #F4A261",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {timeElapsed}
      </div>
      <div style={{ width: "30%", padding: "1rem" }}>
        <button
          id="button"
          onClick={startStopwatch}
          style={{ padding: "0.5rem", margin: "0.5rem" }}
        >
          <FaPlay size={20} />
        </button>
        <button
          id="button"
          onClick={pauseStopwatch}
          style={{ padding: "0.5rem", margin: "0.5rem" }}
        >
          <FaCirclePause size={20} />
        </button>
        <button
          id="button"
          onClick={resetStopwatch}
          style={{ padding: "0.5rem", margin: "0.5rem" }}
        >
          <RiResetLeftFill size={20} />
        </button>
        <button
          id="button"
          onClick={handleDelete}
          style={{ padding: "0.5rem", margin: "0.5rem" }}
        >
          <RiDeleteBin6Line size={20} />
        </button>
      </div>
    </>
  );
};

export default Stopwatch;
