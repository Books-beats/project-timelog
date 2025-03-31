"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { FaStopwatch } from "react-icons/fa";

import ProjectBar from "./ProjectBar";
import AddProject from "./AddProject";
import Filter from "./Filter";

type Project = {
  title: string;
  id: string;
  timeElapsed: string;
}

const Container = () => {
  const [projectsArray, setProjectsArray] = useState<Project[]>([]);
  const [filteredId, setFilteredId] = useState<string>(null);

  const [projectStore, setProjectStore] = useLocalStorage(
    "project",
    JSON.stringify([])
  );

  useEffect(() => {
    const storedProjects = JSON.parse(projectStore);
    setProjectsArray(storedProjects);
  }, []);

  // updates the local storage
  useEffect(() => {
    console.log('Setting projects store', { projectsArray })
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
  };

  // removes project of given id from projectsArray
  const removeProject = (id) => {
    let removeIndex;
    projectsArray.map((project, index) => {
      if (project.id === id) {
        removeIndex = index;
      }
    });

    // projectsArray.splice(removeIndex, 1);
    const newProjectsArray = projectsArray.filter((project, index) => index !== removeIndex)
    console.log(
      "Delete", { removeIndex, projectsArray, newProjectsArray })
    
    // setting projectsArray
    setProjectsArray(newProjectsArray);
  };

  // filtering based on given id. New array is created which includes project with the given id.
  const filterProject = (id) => {
    if (id === "all") {
      setFilteredId(null);
      return
    }
    setFilteredId(id)
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
        {projectsArray.filter(project => project.id === filteredId || filteredId === null).map((project, index) => (
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
