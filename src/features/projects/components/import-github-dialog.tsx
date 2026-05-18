"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseGitHubRepositoryUrl } from "@/lib/github";

const formSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Enter a valid GitHub repository URL.")
    .refine(value => parseGitHubRepositoryUrl(value) !== null, {
      message: "Enter a valid GitHub repository URL.",
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface ImportGitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportGitHubDialog({
  open,
  onOpenChange,
}: ImportGitHubDialogProps) {
  const router = useRouter();
  const clerk = useClerk();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        url: "",
      });
    }
  }, [form, open]);

  const handleGitHubNotConnected = () => {
    toast.error("GitHub access needs to be reconnected.", {
      action: {
        label: "Open profile",
        onClick: () => clerk.openUserProfile(),
      },
    });
  };

  const onSubmit = form.handleSubmit(async values => {
    try {
      const response = await fetch("/api/github/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const json = (await response.json().catch(() => null)) as
        | { success?: boolean; projectId?: string; error?: string }
        | null;
      const errorMessage = json?.error ?? "";

      if (!response.ok) {
        if (
          errorMessage.includes("GitHub") &&
          (errorMessage.includes("connected") ||
            errorMessage.includes("access token") ||
            errorMessage.includes("repo scope") ||
            errorMessage.includes("repository access"))
        ) {
          handleGitHubNotConnected();
          return;
        }

        toast.error(errorMessage || "Unable to import repository.");
        return;
      }

      if (!json?.projectId) {
        toast.error("Unable to import repository.");
        return;
      }

      toast.success("Importing repository.");
      onOpenChange(false);
      form.reset({
        url: "",
      });
      router.push(`/projects/${json.projectId}`);
    } catch {
      toast.error("Unable to import repository.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>
            Entering a GitHub repo URL creates a new Polaris project with the
            repository contents.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label htmlFor="github-url" className="text-sm font-medium">
              Repository URL
            </label>
            <Input
              id="github-url"
              placeholder="https://github.com/owner/repo"
              autoComplete="off"
              {...form.register("url")}
            />
            {form.formState.errors.url ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.url.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing
                </>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
