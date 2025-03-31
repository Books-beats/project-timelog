import { useState } from "react";
import { IoIosSearch } from "react-icons/io";

const Filter = ({ projectsArray, filterProject }) => {
  const [selectedProject, setSelectedProject] = useState("all");
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const formJson = Object.fromEntries(formData.entries());

    e.target.reset();
    filterProject(formJson.projectid);
  };
  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: "flex" }}>
        <select
          id="title"
          name="projectid"
          className="col-span-3"
          style={{ width: "100%" }}
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          {projectsArray.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
          <option key="all" value="all">
            All
          </option>
        </select>
        <button type="submit">
          <IoIosSearch size={30} color="#f4a261" />
        </button>
      </form>
    </>
  );
};

export default Filter;
