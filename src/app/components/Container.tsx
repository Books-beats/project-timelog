"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

import ProjectBar from "./ProjectBar";
import AddProject from "./AddProject";

const Container = () => {
  const [projectsArray, setProjectsArray] = useState([]);
  const [displayTime, setDisplayTime] = useState("00:00:00");
  const [projectStore, setProjectStore] = useLocalStorage(
    "project",
    JSON.stringify([])
  );
  // console.log(projectStore);

  useEffect(() => {
    const storedProjects = JSON.parse(projectStore);
    console.log(storedProjects);
    if (storedProjects.length > 0) {
      setProjectsArray(storedProjects);
    } else {
      const defaultProjects = [
        { title: "Project 1", id: "1", timeElapsed: "00:00:00" },
        { title: "Project 2", id: "2", timeElapsed: "00:00:00" },
        { title: "Project 3", id: "3", timeElapsed: "00:00:00" },
      ];
      setProjectsArray(defaultProjects);
      setProjectStore(JSON.stringify(defaultProjects));
    }
  }, []);
  /*
  useEffect(() => {
    localStorage.setItem("project", JSON.stringify(projectsArray));
  }, [projectsArray, setProjectsArray]);

  let result;
  useEffect(() => {
    result = JSON.parse(localStorage.getItem("project")) || [];
    console.log(result);
  }, []); */

  // updates the local storage
  useEffect(() => {
    setProjectStore(JSON.stringify(projectsArray));
  }, [projectsArray]);

  // const updateElapsedTime = (timeElapsed, id) => {
  //   const storedProjects = JSON.parse(projectStore);
  //   storedProjects.map((project) => {
  //     if (project.id === id) {
  //       project.timeElapsed = timeElapsed;
  //     }
  //   });
  //   setDisplayTime(timeElapsed);
  // };

  // updates the timeElapsed of project with the given id.
  const updateProject = (timeElapsed, id) => {
    projectsArray.map((project) => {
      if (project.id === id) {
        project.timeElapsed = timeElapsed;
      }
    });
    setProjectsArray(projectsArray);
    setProjectStore(JSON.stringify(projectsArray));
  };

  const addNewProject = (newProject) => {
    setProjectsArray([...projectsArray, newProject]);
  };

  return (
    <>
      <div
        id="MainWrapper"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          id="header"
          style={{
            width: "100%",
            height: "3rem",
            fontSize: "24px",
            fontWeight: "bold",
            padding: "0.25rem",
          }}
        >
          Project Timelog
        </div>
        <div
          id="addprojectwrapper"
          style={{
            display: "flex",
            flexDirection: "row",
            width: "70%",
            alignItems: "center",
            justifyContent: "end",
          }}
        >
          <AddProject addNewProject={addNewProject} />
        </div>
        {projectsArray.map((project, index) => (
          <ProjectBar
            key={index}
            project={project}
            updateProject={updateProject}
            projectStore={projectStore}
            updateElapsedTime={"nbj"}
            displayTime={displayTime}
          />
        ))}
      </div>
    </>
  );
};

export default Container;
