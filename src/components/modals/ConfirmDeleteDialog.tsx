
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

interface ConfirmDeleteDialogProps {
  lotId: string;
  lotName: string;
  assignmentCount: number;
  trigger?: React.ReactNode;
  onConfirm: (lotId: string) => Promise<void>;
}

export function ConfirmDeleteDialog({
  lotId,
  lotName,
  assignmentCount,
  onConfirm,
  trigger,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await onConfirm(lotId);
        toast({
          title: "Deletion Successful",
          description: `The lot "${lotName}" has been permanently deleted.`,
        });
        setOpen(false);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Deletion Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <div onClick={() => setOpen(true)}>{trigger}</div>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the lot
            <strong className="px-1">{lotName}</strong>.
            {assignmentCount > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-900">
                <p className="font-bold">
                  This lot is associated with {assignmentCount} job assignment(s).
                  Deleting this lot will also delete all of its associated jobs.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              "Yes, delete permanently"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
