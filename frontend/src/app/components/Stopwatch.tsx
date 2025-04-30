"use client";

import { useEffect, useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";
import { FaCirclePause } from "react-icons/fa6";
import { RiResetLeftFill, RiDeleteBin6Line } from "react-icons/ri";

const formatElapsedTime = (seconds: number) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const Stopwatch = ({ id, removeProject, updateProject, elapsedTime }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [displayTime, setDisplayTime] = useState(elapsedTime); // seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayTime(elapsedTime);
  }, [elapsedTime]);

  const startStopwatch = () => {
    if (isRunning) return;
    setIsRunning(true);

    // Set base time
    startTimestampRef.current = Date.now() - elapsedTime * 1000;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const newElapsed = Math.floor((now - startTimestampRef.current!) / 1000);
      setDisplayTime(newElapsed);
      updateProject(id, { elapsedTime: newElapsed }); // save seconds
    }, 1000);
  };

  const pauseStopwatch = () => {
    if (!isRunning) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  };

  const resetStopwatch = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayTime(0);
    setIsRunning(false);
    updateProject(id, { elapsedTime: 0 });
  };

  const handleDelete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    removeProject(id);
  };

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
        {formatElapsedTime(displayTime)}
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
