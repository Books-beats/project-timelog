"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { FaStopwatch } from "react-icons/fa";

import ProjectBar from "./ProjectBar";
import AddProject from "./AddProject";
import Filter from "./Filter";

const Container = () => {
  const defaultProjects = [
    { title: "Project 1", id: "1", timeElapsed: "00:00:00" },
    { title: "Project 2", id: "2", timeElapsed: "00:00:00" },
    { title: "Project 3", id: "3", timeElapsed: "00:00:00" },
  ];
  const [projectsArray, setProjectsArray] = useState([]);

  // Creating new array named as displayProjects which will include the projects to be displayed in the ui
  const [displayProjects, setDisplayProjects] = useState([defaultProjects]);

  const [projectStore, setProjectStore] = useLocalStorage(
    "project",
    JSON.stringify([])
  );

  useEffect(() => {
    const storedProjects = JSON.parse(projectStore);
    if (storedProjects.length > 0) {
      setProjectsArray(storedProjects);
      setDisplayProjects(storedProjects);
    } else {
      setProjectsArray(defaultProjects);
      setProjectStore(JSON.stringify(defaultProjects));
    }
  }, []);

  // updates the local storage
  useEffect(() => {
    setProjectStore(JSON.stringify(projectsArray));
  }, [projectsArray]);

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
    setDisplayProjects([...displayProjects, newProject]);
  };

  // removes project of given id from projectsArray and displayProjects
  const removeProject = (id) => {
    let removeIndex;
    projectsArray.map((project, index) => {
      if (project.id === id) {
        removeIndex = index;
      }
    });

    projectsArray.splice(removeIndex, 1);

    // setting projectsArray & displayProjects
    setProjectsArray(projectsArray);
    setDisplayProjects(projectsArray);
  };

  // filtering based on given id. New array is created which includes project with the given id.
  const filterProject = (id) => {
    if (id === "all") {
      setDisplayProjects(projectsArray);
    }

    const removeIndex = projectsArray.findIndex((project) => project.id === id);
    if (removeIndex === -1) return;
    const filteredProjects = projectsArray.filter(
      (project) => project.id === id
    );

    // setting the displayProjects with the new array
    setDisplayProjects(filteredProjects);
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
            display: "flex",
          }}
        >
          Project Timelog
          <FaStopwatch size={30} />
        </div>
        <div
          id="addfilterwrapper"
          style={{
            display: "flex",
            flexDirection: "row",
            width: "70%",
            alignItems: "center",
            justifyContent: "space-between",
            marginBlockStart: "2rem",
          }}
        >
          <div
            id="filter"
            style={{
              width: "28%",
              color: "black",
              background: "#F9F9F9",
              border: "1px solid #E0E0E0",
              height: "100%",
            }}
          >
            <Filter
              projectsArray={projectsArray}
              filterProject={filterProject}
            />
          </div>
          <div id="addprojectwrapper">
            <AddProject addNewProject={addNewProject} />
          </div>
        </div>
        {displayProjects.map((project, index) => (
          <ProjectBar
            removeProject={removeProject}
            key={index}
            project={project}
            updateProject={updateProject}
            projectStore={projectStore}
            updateElapsedTime={"nbj"}
          />
        ))}
      </div>
    </>
  );
};

export default Container;
