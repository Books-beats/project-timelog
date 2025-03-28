"use client";

import { useState } from "react";
import { FaPlay } from "react-icons/fa";
import { FaCirclePause } from "react-icons/fa6";
import { RiResetLeftFill } from "react-icons/ri";

const Stopwatch = ({
  id,
  updateProject,
  timeElapsed,
  projectStore,
  updateElapsedTime,
  displayTime,
}) => {
  let startTime;
  let elapsedPausedTime = 0;
  const today = new Date();
  console.log(today);
  const [stopwatchInterval, setStopwatchInterval] = useState<any>();
  const [isRunning, setIsRunning] = useState(false);

  function startStopwatch() {
    let timeParts = timeElapsed.split(":");
    console.log(timeParts);
    let date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      Number(timeParts[0]),
      Number(timeParts[1]),
      Number(timeParts[2])
    );
    console.log(date);
    if (!isRunning) {
      let setinterval = setInterval(updateStopwatch, 1000);
      startTime = date.getTime() - elapsedPausedTime;
      setStopwatchInterval(setinterval);
      setIsRunning(true);
    }
    console.log("start", isRunning);
  }

  function pauseStopwatch() {
    console.log("pause");
    console.log("isRunning", isRunning);
    if (isRunning) {
      clearInterval(stopwatchInterval);
      elapsedPausedTime = new Date().getTime() - startTime;
      setIsRunning(false);
    }
  }

  function stopStopwatch() {
    clearInterval(stopwatchInterval);
    elapsedPausedTime = new Date().getTime() - startTime;
    setIsRunning(false);
    elapsedPausedTime = 0;
    document.getElementById(`${id}`).innerHTML = "00:00:00";
    console.log("stop");
  }

  function resetStopwatch() {
    stopStopwatch();
  }

  function updateStopwatch() {
    var currentTime = new Date().getTime();
    var elapsedTime = currentTime - startTime;
    var seconds = Math.floor(elapsedTime / 1000) % 60;
    var minutes = Math.floor(elapsedTime / 1000 / 60) % 60;
    var hours = Math.floor(elapsedTime / 1000 / 60 / 60);
    var displayTime = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    updateProject(displayTime, id);
    // updateElapsedTime(displayTime, id);
    document.getElementById(`${id}`).innerHTML = displayTime;
  }

  function pad(number) {
    return (number < 10 ? "0" : "") + number;
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
        {/* {displayTime} */}
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
      </div>
    </>
  );
};

export default Stopwatch;
