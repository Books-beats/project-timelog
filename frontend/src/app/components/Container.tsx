"use client";

import { useState, useEffect } from "react";
import { FaStopwatch } from "react-icons/fa";

import ProjectBar from "./ProjectBar";
import AddProject from "./AddProject";
import Filter from "./Filter";

type Project = {
  name: string;
  id: string;
  elapsedTime: number;
};

const Container = () => {
  const [projectsArray, setProjectsArray] = useState<Project[]>([]);

  async function fetchAllTasks() {
    try {
      const response = await fetch("http://localhost:3000/tasks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const tasks = await response.json();
      return tasks;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  }

  useEffect(() => {
    async function loadTasks() {
      const fetchedTasks = await fetchAllTasks();
      setProjectsArray(fetchedTasks);
    }
    loadTasks();
  }, []);

  // updates the elapsedTime of project with the given id.
  const updateProject = async (id, { elapsedTime, name }) => {
    const updatedProjects = projectsArray.map((project) => {
      if (project.id === id) {
        return {
          ...project,
          ...(elapsedTime !== undefined && { elapsedTime }),
          ...(name !== undefined && { name }),
        };
      }
      return project;
    });

    setProjectsArray(updatedProjects);
    try {
      await fetch(`http://localhost:3000/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(elapsedTime !== undefined && { elapsedTime }),
          ...(name !== undefined && { name }),
        }),
      });
    } catch (err) {
      console.error("Failed to update project on backend", err);
    }
  };

  const addNewProject = (newProject) => {
    setProjectsArray([...projectsArray, newProject]);
  };

  // removes project of given id from projectsArray.
  const removeProject = async (id) => {
    let removeIndex;

    // Finding the index of the project to be removed based on given id
    projectsArray.map((project, index) => {
      if (project.id === id) {
        removeIndex = index;
      }
    });

    // Creating new array of projects excluding the removed project
    const newProjectsArray = projectsArray.filter(
      (project, index) => index !== removeIndex
    );

    // setting projectsArray
    setProjectsArray(newProjectsArray);

    try {
      await fetch(`http://localhost:3000/tasks/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete project on backend", err);
    }
  };

  // filtering based on given id.
  const filterProject = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/tasks/${id}`);
      const result = await response.json();
      console.log(result.data);
      setProjectsArray(result.data);
    } catch (err) {
      console.error("Failed to fetch filtered tasks", err);
    }
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

        {projectsArray.map((project, index) => (
          <ProjectBar
            removeProject={removeProject}
            key={index}
            project={project}
            updateProject={updateProject}
          />
        ))}
      </div>
    </>
  );
};

export default Container;
