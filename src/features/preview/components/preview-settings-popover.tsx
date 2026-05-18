"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useUpdateProjectSettings } from "../../projects/hooks/use-projects";

type ProjectSettings = {
  installCommand?: string;
  devCommand?: string;
};

interface PreviewSettingsPopoverProps {
  projectId: Id<"projects">;
  initialValues?: ProjectSettings;
  onSave?: () => void;
}

export function PreviewSettingsPopover({
  projectId,
  initialValues,
  onSave,
}: PreviewSettingsPopoverProps) {
  const updateSettings = useUpdateProjectSettings();
  const [open, setOpen] = useState(false);
  const [installCommand, setInstallCommand] = useState("");
  const [devCommand, setDevCommand] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setInstallCommand(initialValues?.installCommand ?? "");
      setDevCommand(initialValues?.devCommand ?? "");
    }
  };

  const handleSave = async () => {
    try {
      const nextSettings: ProjectSettings = {};
      const trimmedInstallCommand = installCommand.trim();
      const trimmedDevCommand = devCommand.trim();

      if (trimmedInstallCommand) {
        nextSettings.installCommand = trimmedInstallCommand;
      }

      if (trimmedDevCommand) {
        nextSettings.devCommand = trimmedDevCommand;
      }

      await updateSettings({
        id: projectId,
        settings: Object.keys(nextSettings).length ? nextSettings : undefined,
      });

      setOpen(false);
      onSave?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings.");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Preview settings">
          <Settings2 className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverHeader>
          <PopoverTitle>Preview settings</PopoverTitle>
          <PopoverDescription>
            Configure the install and dev commands used by WebContainers.
          </PopoverDescription>
        </PopoverHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="install-command">Install command</Label>
            <Input
              id="install-command"
              value={installCommand}
              onChange={event => setInstallCommand(event.target.value)}
              placeholder="npm install"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dev-command">Dev command</Label>
            <Input
              id="dev-command"
              value={devCommand}
              onChange={event => setDevCommand(event.target.value)}
              placeholder="npm run dev"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
