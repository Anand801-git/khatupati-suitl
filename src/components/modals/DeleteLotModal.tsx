
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
import { Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface DeleteLotModalProps {
  lotName: string;
  pieceCount: number;
  assignmentCount: number;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
}

export function DeleteLotModal({ lotName, pieceCount, assignmentCount, onConfirm, trigger }: DeleteLotModalProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button 
          variant="destructive" 
          className="gap-2" 
          onClick={() => setOpen(true)}
        >
          <Trash2 className="w-4 h-4" /> Delete Lot
        </Button>
      )}
      <AlertDialogContent style={{ animation: `fade-up 0.4s ease-out 0ms both` }} className="border-destructive/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Cascade Deletion Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
              <div className="font-bold text-foreground">
                Warning: This will delete the <span className="text-destructive">{pieceCount}-piece</span> lot "{lotName}" and all <span className="text-destructive">{assignmentCount} vendor assignments</span>.
              </div>
              <div>
                This action is permanent and cannot be undone. All production history, costs, and challan records associated with this lot will be wiped from the system.
              </div>
              <div className="font-medium text-destructive/80 italic">Continue?</div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Everything"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
