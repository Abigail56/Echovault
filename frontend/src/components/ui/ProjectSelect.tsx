import { useAsync } from "@/hooks/useAsync";
import { projectsApi } from "@/lib/api/services";

interface ProjectSelectProps {
  id?: string;
  value: string | null;
  onChange: (projectId: string | null) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  /** Text for the "no project" option, e.g. "All projects" when used as a filter. */
  emptyLabel?: string;
}

/** Choose one of the user's projects (or none). */
export function ProjectSelect({ id, value, onChange, emptyLabel = "No project", ...aria }: ProjectSelectProps) {
  const { data, loading, error } = useAsync(
    (signal) => projectsApi.list({ limit: 100, sort: "name", order: "asc" }, signal),
    [],
  );

  return (
    <select
      id={id}
      {...aria}
      className="select w-full"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={loading}
    >
      <option value="">{loading ? "Loading projects…" : error ? "Couldn't load projects" : emptyLabel}</option>
      {data?.items.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
}
