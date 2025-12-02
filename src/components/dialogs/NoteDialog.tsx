import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName?: string;
  lessonDate?: string;
  note: string;
  onNoteChange: (note: string) => void;
  onSave: () => void;
}

export const NoteDialog = ({
  open,
  onOpenChange,
  studentName,
  lessonDate,
  note,
  onNoteChange,
  onSave,
}: NoteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הערה עבור {studentName}</DialogTitle>
          <DialogDescription>
            תאריך השיעור: {lessonDate && format(new Date(lessonDate), "dd/MM/yyyy", { locale: he })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="הוסף הערה..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="min-h-[120px] resize-none"
            dir="rtl"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={onSave}>
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

