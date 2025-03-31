"use client";
import Stopwatch from "./Stopwatch";
import { EditText } from "react-edit-text";
import "react-edit-text/dist/index.css";

const ProjectBar = ({ removeProject, project, updateProject }) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "70%",
          alignItems: "center",
          margin: "2%",
          padding: "1rem",
          background: "white",
          border: "1px solid #E9C46A",
        }}
      >
        <div style={{ width: "50%", padding: "1rem" }}>
          <EditText showEditButton defaultValue={project.title} />
        </div>
        <Stopwatch
          id={project.id}
          removeProject={removeProject}
          updateProject={updateProject}
          timeElapsed={project.timeElapsed}
        />
      </div>
    </>
  );
};

export default ProjectBar;
