import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  Globe,
  FolderKanban,
  Factory,
  Lightbulb,
  BookOpen,
  Shield,
  Plus,
} from "lucide-react";
import { projects, registry } from "../lib/mock-data";

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
              <CommandItem icon={<Globe size={14} />} label="Universe" onSelect={() => go("/")} />
              <CommandItem icon={<FolderKanban size={14} />} label="Projects" onSelect={() => go("/projects")} />
              <CommandItem icon={<Factory size={14} />} label="Factory" onSelect={() => go("/factory")} />
              <CommandItem icon={<Lightbulb size={14} />} label="Findings" onSelect={() => go("/findings")} />
              <CommandItem icon={<BookOpen size={14} />} label="Publications" onSelect={() => go("/publications")} />
              <CommandItem icon={<Shield size={14} />} label="Access control" onSelect={() => go("/settings/access")} />
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

            <Command.Group heading="Registry" className="text-xs text-[var(--muted-foreground)] px-2 py-1.5">
              {registry.slice(0, 10).map((e) => (
                <CommandItem
                  key={e.id}
                  icon={<span className="text-[10px] font-mono w-3.5 text-center text-[var(--muted-foreground)]">#{e.id}</span>}
                  label={e.labels[0]}
                  onSelect={() => { setOpen(false); }}
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
