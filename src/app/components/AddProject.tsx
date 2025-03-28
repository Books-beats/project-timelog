import { useState } from "react";
import { IoMdAdd } from "react-icons/io";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AddProject = ({ addNewProject }) => {
  const getRandomNumber = (min, max) => {
    return Math.random() * (max - min) + min;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const formJson = Object.fromEntries(formData.entries());
    console.log(formJson);

    formJson.id = getRandomNumber(4, 100);
    formJson.timeElapsed = "00:00:00";
    addNewProject(formJson);
    e.target.reset();
  };
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" id="button">
            <IoMdAdd />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
          </DialogHeader>
          <div>
            <form onSubmit={handleSubmit}>
              <label className="text-right mr-2">
                Name
                <input id="title" name="title" className="col-span-3" />
              </label>
              <button type="submit" id="button">
                ok
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddProject;
