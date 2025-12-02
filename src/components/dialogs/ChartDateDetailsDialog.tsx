import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import { cn } from "@/lib/utils";
import type { Student, AttendanceRecord, Lesson } from "@/store/api/attendanceApi";

interface ChartDateDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDateData: {
    date: string;
    lessonId: string;
  } | null;
  lesson: Lesson | undefined;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  filter: 'all' | 'attended' | 'absent';
  onFilterChange: (filter: 'all' | 'attended' | 'absent') => void;
  onClose: () => void;
}

export const ChartDateDetailsDialog = ({
  open,
  onOpenChange,
  selectedDateData,
  lesson,
  students,
  attendanceRecords,
  filter,
  onFilterChange,
  onClose,
}: ChartDateDetailsDialogProps) => {
  if (!selectedDateData || !lesson) return null;

  const attendedList: Array<{ student: Student; record?: AttendanceRecord }> = [];
  const absentList: Array<{ student: Student; record?: AttendanceRecord }> = [];

  students.forEach((student) => {
    const attendanceRecord = attendanceRecords.find(
      (r) => r.lesson_id === lesson.id && r.student_id === student.id
    );

    if (attendanceRecord && attendanceRecord.attended) {
      attendedList.push({ student, record: attendanceRecord });
    } else {
      absentList.push({ student, record: attendanceRecord || undefined });
    }
  });

  const handleFilterClick = (filterType: 'attended' | 'absent') => {
    if (filter === filterType) {
      onFilterChange('all');
    } else {
      onFilterChange(filterType);
    }
  };

  const showAttended = filter === 'all' || filter === 'attended';
  const showAbsent = filter === 'all' || filter === 'absent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">
            פרטי נוכחות - {format(new Date(selectedDateData.date), "dd/MM/yyyy", { locale: he })}
          </DialogTitle>
          <DialogDescription className="text-right">
            רשימת כל התלמידים והסטטוס שלהם בתאריך זה
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                className={cn(
                  "p-3 bg-green-50 rounded-md cursor-pointer transition-all hover:bg-green-100",
                  filter === 'attended' && "ring-2 ring-green-500"
                )}
                onClick={() => handleFilterClick('attended')}
              >
                <p className="text-sm font-semibold text-green-700">נוכחים</p>
                <p className="text-2xl font-bold text-green-700">{attendedList.length}</p>
              </div>
              <div
                className={cn(
                  "p-3 bg-red-50 rounded-md cursor-pointer transition-all hover:bg-red-100",
                  filter === 'absent' && "ring-2 ring-red-500"
                )}
                onClick={() => handleFilterClick('absent')}
              >
                <p className="text-sm font-semibold text-red-700">נעדרים</p>
                <p className="text-2xl font-bold text-red-700">{absentList.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              {showAttended && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-green-700">נוכחים ({attendedList.length})</h4>
                  <div className="space-y-1">
                    {attendedList.map((item) => (
                      <div key={item.student.id} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                        <span>{item.student.name}</span>
                        {item.record?.note && (
                          <span className="text-xs text-muted-foreground">הערה: {item.record.note}</span>
                        )}
                      </div>
                    ))}
                    {attendedList.length === 0 && (
                      <p className="text-sm text-muted-foreground">אין נוכחים</p>
                    )}
                  </div>
                </div>
              )}

              {showAbsent && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-red-700">נעדרים ({absentList.length})</h4>
                  <div className="space-y-1">
                    {absentList.map((item) => (
                      <div key={item.student.id} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                        <span>{item.student.name}</span>
                        {item.record?.note && (
                          <span className="text-xs text-muted-foreground">הערה: {item.record.note}</span>
                        )}
                      </div>
                    ))}
                    {absentList.length === 0 && (
                      <p className="text-sm text-muted-foreground">אין נעדרים</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

