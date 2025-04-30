import { useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { IoSend } from "react-icons/io5";

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
  const [open, setOpen] = useState<boolean>(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const formJson = Object.fromEntries(formData.entries());

    const bodyToSend = {
      name: formJson.title,
      elapsedTime: 0,
    };
    try {
      const response = await fetch("http://localhost:3000/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyToSend),
      });

      const createdTask = await response.json();

      addNewProject(createdTask);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" id="button">
            <IoMdAdd />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] text-gray-700">
          <DialogHeader>
            <DialogTitle className="py-1">
              Add Project
              <hr style={{ marginBlockStart: "10px" }} />
            </DialogTitle>
          </DialogHeader>
          <div>
            <form onSubmit={handleSubmit}>
              <label className="text-right mr-2">
                Name
                <input
                  id="title"
                  name="title"
                  className="col-span-3"
                  style={{
                    margin: "10px",
                    border: "1px solid black",
                    borderRadius: "5px",
                  }}
                />
              </label>
              <button type="submit" id="button" style={{ padding: "0.5rem" }}>
                <IoSend />
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddProject;
