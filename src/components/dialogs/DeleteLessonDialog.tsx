import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";

interface DeleteLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonDate?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteLessonDialog = ({
  open,
  onOpenChange,
  lessonDate,
  onConfirm,
  onCancel,
}: DeleteLessonDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>מחיקת שיעור</DialogTitle>
          <DialogDescription>
            האם אתה בטוח שברצונך למחוק את השיעור מתאריך{" "}
            {lessonDate && format(new Date(lessonDate), "dd/MM/yyyy", { locale: he })}?
            <br />
            <span className="text-destructive font-semibold mt-2 block">
              פעולה זו תמחק גם את כל רשומות הנוכחות הקשורות לשיעור זה ולא ניתן לבטל אותה.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            מחק
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

