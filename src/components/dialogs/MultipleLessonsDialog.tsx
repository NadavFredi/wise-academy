import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/DatePickerInput";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, Save, X } from "lucide-react";

interface MultipleLessonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dates: (Date | null)[];
  onAddRow: () => void;
  onRemoveDate: (index: number) => void;
  onUpdateDate: (index: number, date: Date | null) => void;
  onSave: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

export const MultipleLessonsDialog = ({
  open,
  onOpenChange,
  dates,
  onAddRow,
  onRemoveDate,
  onUpdateDate,
  onSave,
  onCancel,
  isCreating,
}: MultipleLessonsDialogProps) => {
  const allDatesFilled = dates.length > 0 && dates.every(date => date !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור שיעורים מרובים</DialogTitle>
          <DialogDescription>
            לחץ על + כדי להוסיף שורה חדשה. מלא את כל התאריכים לפני השמירה.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={onAddRow}
              size="sm"
              variant="outline"
            >
              <Plus className="ml-2 h-4 w-4" />
              הוסף שורה
            </Button>
          </div>

          {dates.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>תאריך</TableHead>
                    <TableHead className="w-24">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dates.map((date, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <DatePickerInput
                          value={date}
                          onChange={(newDate) => onUpdateDate(index, newDate)}
                          wrapperClassName="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveDate(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              לחץ על + כדי להוסיף שורה חדשה
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
            disabled={isCreating || !allDatesFilled}
          >
            {isCreating ? (
              <>
                <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                יוצר...
              </>
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                שמור ({dates.filter(d => d !== null).length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

