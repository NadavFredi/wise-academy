import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Plus, RefreshCw, Save, X } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";

interface MultipleLessonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dates: Date[];
  newDate: Date | null;
  onNewDateChange: (date: Date | null) => void;
  onAddDate: () => void;
  onRemoveDate: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

export const MultipleLessonsDialog = ({
  open,
  onOpenChange,
  dates,
  newDate,
  onNewDateChange,
  onAddDate,
  onRemoveDate,
  onSave,
  onCancel,
  isCreating,
}: MultipleLessonsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור שיעורים מרובים</DialogTitle>
          <DialogDescription>
            הוסף תאריכים מרובים ליצירת שיעורים בבת אחת
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-date-to-add">הוסף תאריך</Label>
            <div className="flex gap-2">
              <DatePickerInput
                value={newDate}
                onChange={onNewDateChange}
                wrapperClassName="flex-1"
              />
              <Button
                onClick={onAddDate}
                disabled={!newDate}
                size="sm"
              >
                <Plus className="ml-2 h-4 w-4" />
                הוסף
              </Button>
            </div>
          </div>

          {dates.length > 0 && (
            <div className="space-y-2">
              <Label>תאריכים שנוספו ({dates.length})</Label>
              <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto space-y-2">
                {dates.map((date, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-accent rounded-md"
                  >
                    <span className="text-sm">
                      {format(date, "dd/MM/yyyy", { locale: he })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveDate(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            ביטול
          </Button>
          <Button
            onClick={onSave}
            disabled={isCreating || dates.length === 0}
          >
            {isCreating ? (
              <>
                <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                יוצר...
              </>
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                שמור ({dates.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

