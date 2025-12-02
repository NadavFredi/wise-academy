import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/DatePickerInput";

interface EditLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonDate: Date | null;
  onLessonDateChange: (date: Date | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const EditLessonDialog = ({
  open,
  onOpenChange,
  lessonDate,
  onLessonDateChange,
  onSave,
  onCancel,
}: EditLessonDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>ערוך תאריך שיעור</DialogTitle>
          <DialogDescription>
            שנה את תאריך השיעור
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="edit-lesson-date">תאריך השיעור</Label>
          <DatePickerInput
            id="edit-lesson-date"
            value={lessonDate}
            onChange={onLessonDateChange}
            wrapperClassName="mt-1"
            autoOpenOnFocus={false}
            autoOpen={open}
            usePortal={false}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
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

