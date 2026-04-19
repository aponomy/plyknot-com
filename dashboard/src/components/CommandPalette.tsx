import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  Home,
  Globe,
  FolderKanban,
  Factory,
  FileInput,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import { projects } from "../lib/mock-data";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(path: string) {
    navigate(path);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative mx-auto mt-[20vh] w-full max-w-lg">
        <Command className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
          <Command.Input
            placeholder="Search or jump to…"
            className="w-full px-4 py-3 text-sm bg-transparent border-b border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--muted-foreground)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs text-[var(--muted-foreground)] px-2 py-1.5">
              <CommandItem icon={<Home size={14} />} label="Home" onSelect={() => go("/")} />
              <CommandItem icon={<Globe size={14} />} label="Universe" onSelect={() => go("/universe")} />
              <CommandItem icon={<FolderKanban size={14} />} label="Projects" onSelect={() => go("/projects")} />
              <CommandItem icon={<Factory size={14} />} label="Factory" onSelect={() => go("/factory")} />
              <CommandItem icon={<FileInput size={14} />} label="Extraction" onSelect={() => go("/extraction")} />
              <CommandItem icon={<ClipboardCheck size={14} />} label="Review queue" onSelect={() => go("/review")} />
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--border)] my-1" />

            <Command.Group heading="Projects" className="text-xs text-[var(--muted-foreground)] px-2 py-1.5">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  icon={<span className="text-xs font-mono w-3.5 text-center">◈</span>}
                  label={p.name}
                  onSelect={() => go(`/projects/${p.id}`)}
                />
              ))}
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--border)] my-1" />

            <Command.Group heading="Actions" className="text-xs text-[var(--muted-foreground)] px-2 py-1.5">
              <CommandItem icon={<Plus size={14} />} label="New project" onSelect={() => go("/projects")} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer text-[var(--foreground)] data-[selected=true]:bg-[var(--muted)] transition-colors"
    >
      <span className="text-[var(--muted-foreground)]">{icon}</span>
      {label}
    </Command.Item>
  );
}
