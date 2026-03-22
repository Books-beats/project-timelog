import { Project, Tag } from '@/lib/api';
import ProjectCard from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  allTags: Tag[];
  onUpdate: (p: Project) => void;
  onDelete: (id: string) => void;
  onNewTag: (t: Tag) => void;
}

export default function ProjectGrid({ projects, allTags, onUpdate, onDelete, onNewTag }: ProjectGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(p => (
        <ProjectCard
          key={p.id}
          project={p}
          allTags={allTags}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onNewTag={onNewTag}
        />
      ))}
    </div>
  );
}
