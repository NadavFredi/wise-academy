import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import {
  setSelectedCohort,
  setSelectedDates,
  toggleDate,
  clearSelectedDates,
} from "@/store/slices/attendanceSlice";
import {
  useGetStudentsQuery,
  useGetLessonsQuery,
  useGetAttendanceQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useUpdateAttendanceMutation,
} from "@/store/api/attendanceApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, StickyNote, MessageSquare, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { DatePickerInput } from "@/components/DatePickerInput";
import wiseLogo from "@/assets/icons/wise-logo.webp";

const Attendance = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { selectedCohortId, selectedDates } = useAppSelector((state) => state.attendance);
  
  const [newLessonDate, setNewLessonDate] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentNoteData, setCurrentNoteData] = useState<{
    lessonId: string;
    studentId: string;
    studentName: string;
    lessonDate: string;
    note: string;
  } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
  const [currentLessonToEdit, setCurrentLessonToEdit] = useState<{
    id: string;
    lessonDate: string;
  } | null>(null);
  const [editLessonDate, setEditLessonDate] = useState<Date | null>(null);
  const [sortState, setSortState] = useState<{ lessonId: string; order: 'asc' | 'desc' } | null>(null);
  const [deleteLessonModalOpen, setDeleteLessonModalOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; date: string } | null>(null);

  // RTK Query hooks
  const { data: students = [], isLoading: studentsLoading } = useGetStudentsQuery(
    selectedCohortId || "",
    { skip: !selectedCohortId }
  );
  
  const { data: lessons = [], isLoading: lessonsLoading } = useGetLessonsQuery(
    selectedCohortId || "",
    { skip: !selectedCohortId }
  );

  const lessonIds = useMemo(() => lessons.map((l) => l.id), [lessons]);
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useGetAttendanceQuery(
    lessonIds,
    { skip: lessonIds.length === 0 }
  );

  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();
  const [updateLesson] = useUpdateLessonMutation();
  const [deleteLesson] = useDeleteLessonMutation();
  const [updateAttendance] = useUpdateAttendanceMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Create attendance map
  const attendanceMap = useMemo(() => {
    const map: Record<string, { attended: boolean; note: string }> = {};
    attendanceRecords.forEach((record) => {
      const key = `${record.lesson_id}-${record.student_id}`;
      map[key] = {
        attended: record.attended,
        note: record.note || "",
      };
    });
    return map;
  }, [attendanceRecords]);

  // Filter lessons by date range and sort from earliest to latest
  const filteredLessons = useMemo(() => {
    let filtered = lessons;
    
    if (startDate || endDate) {
      filtered = lessons.filter((lesson) => {
        const lessonDate = new Date(lesson.lesson_date);
        lessonDate.setHours(0, 0, 0, 0);
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return lessonDate >= start && lessonDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return lessonDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return lessonDate <= end;
        }
        return true;
      });
    }
    
    // Sort from earliest to latest
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.lesson_date).getTime();
      const dateB = new Date(b.lesson_date).getTime();
      return dateA - dateB;
    });
  }, [lessons, startDate, endDate]);

  // Sort students by attendance status for selected date
  const sortedStudents = useMemo(() => {
    if (!sortState) return students;

    const lesson = filteredLessons.find((l) => l.id === sortState.lessonId);
    if (!lesson) return students;

    return [...students].sort((a, b) => {
      const keyA = `${lesson.id}-${a.id}`;
      const keyB = `${lesson.id}-${b.id}`;
      const recordA = attendanceMap[keyA];
      const recordB = attendanceMap[keyB];
      const attendedA = recordA?.attended || false;
      const attendedB = recordB?.attended || false;

      if (attendedA === attendedB) return 0;
      
      if (sortState.order === 'asc') {
        // Ascending: attended first (true), then not attended (false)
        return attendedA ? -1 : 1;
      } else {
        // Descending: not attended first (false), then attended (true)
        return attendedA ? 1 : -1;
      }
    });
  }, [students, sortState, filteredLessons, attendanceMap]);

  const handleColumnClick = (lessonId: string) => {
    if (!sortState || sortState.lessonId !== lessonId) {
      // First click: ascending
      setSortState({ lessonId, order: 'asc' });
    } else if (sortState.order === 'asc') {
      // Second click: descending
      setSortState({ lessonId, order: 'desc' });
    } else {
      // Third click: no sort
      setSortState(null);
    }
  };

  const handleCreateLesson = async () => {
    if (!newLessonDate || !selectedCohortId) {
      toast({
        title: "שגיאה",
        description: "אנא בחר תאריך",
        variant: "destructive",
      });
      return;
    }

    try {
      const dateString = format(newLessonDate, "yyyy-MM-dd");
      await createLesson({
        cohortId: selectedCohortId,
        lessonDate: dateString,
      }).unwrap();

      toast({
        title: "הצלחה",
        description: "שיעור חדש נוצר בהצלחה",
      });

      setNewLessonDate(null);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה ביצירת השיעור",
        variant: "destructive",
      });
    }
  };

  const handleAttendanceChange = async (
    lessonId: string,
    studentId: string,
    attended: boolean
  ) => {
    try {
      await updateAttendance({
        lessonId,
        studentId,
        attended,
      }).unwrap();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הנוכחות",
        variant: "destructive",
      });
    }
  };

  const handleOpenNoteModal = (
    lessonId: string,
    studentId: string,
    studentName: string,
    lessonDate: string
  ) => {
    const key = `${lessonId}-${studentId}`;
    const current = attendanceMap[key];
    setCurrentNoteData({
      lessonId,
      studentId,
      studentName,
      lessonDate,
      note: current?.note || "",
    });
    setNoteInput(current?.note || "");
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!currentNoteData) return;

    try {
      const key = `${currentNoteData.lessonId}-${currentNoteData.studentId}`;
      const current = attendanceMap[key];
      await updateAttendance({
        lessonId: currentNoteData.lessonId,
        studentId: currentNoteData.studentId,
        attended: current?.attended || false,
        note: noteInput,
      }).unwrap();

      toast({
        title: "הצלחה",
        description: "ההערה נשמרה בהצלחה",
      });

      setNoteModalOpen(false);
      setCurrentNoteData(null);
      setNoteInput("");
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת ההערה",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleClearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setCurrentLessonToEdit({
      id: lesson.id,
      lessonDate: lesson.lesson_date,
    });
    const lessonDate = new Date(lesson.lesson_date);
    setEditLessonDate(lessonDate);
    setEditLessonModalOpen(true);
  };

  const handleSaveEditLesson = async () => {
    if (!currentLessonToEdit || !editLessonDate) return;

    try {
      const dateString = format(editLessonDate, "yyyy-MM-dd");
      await updateLesson({
        lessonId: currentLessonToEdit.id,
        lessonDate: dateString,
      }).unwrap();

      toast({
        title: "הצלחה",
        description: "תאריך השיעור עודכן בהצלחה",
      });

      setEditLessonModalOpen(false);
      setCurrentLessonToEdit(null);
      setEditLessonDate(null);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בעדכון השיעור",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = (lessonId: string, lessonDate: string) => {
    setLessonToDelete({ id: lessonId, date: lessonDate });
    setDeleteLessonModalOpen(true);
  };

  const handleConfirmDeleteLesson = async () => {
    if (!lessonToDelete) return;

    try {
      await deleteLesson(lessonToDelete.id).unwrap();
      toast({
        title: "הצלחה",
        description: "השיעור נמחק בהצלחה",
      });
      setDeleteLessonModalOpen(false);
      setLessonToDelete(null);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה במחיקת השיעור",
        variant: "destructive",
      });
    }
  };

  const loading = studentsLoading || lessonsLoading || attendanceLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex-1">
        <div className="border-b bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img 
                  src={wiseLogo} 
                  alt="Wise Logo" 
                  className="h-20 w-auto"
                />
                <h1 className="text-2xl font-bold">מערכת נוכחות</h1>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="ml-2 h-4 w-4" />
                התנתק
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {/* Three Cards in One Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Cohort Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">בחירת Cohort</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedCohortId || ""}
                  onValueChange={(value) => dispatch(setSelectedCohort(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר Cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00000000-0000-0000-0000-000000000001">
                      Cohort 1
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Create New Lesson */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  יצירת שיעור חדש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="lesson-date" className="text-sm">תאריך השיעור</Label>
                    <DatePickerInput
                      value={newLessonDate}
                      onChange={setNewLessonDate}
                      wrapperClassName="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateLesson} disabled={creatingLesson} size="sm" className="w-full">
                    <Plus className="ml-2 h-4 w-4" />
                    צור שיעור
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Date Range Filter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">סינון תאריכים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start-date" className="text-sm">מתאריך</Label>
                      <DatePickerInput
                        value={startDate}
                        onChange={setStartDate}
                        wrapperClassName="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-sm">עד תאריך</Label>
                      <DatePickerInput
                        value={endDate}
                        onChange={setEndDate}
                        wrapperClassName="mt-1"
                      />
                    </div>
                  </div>
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDateRange}
                      className="w-full text-xs"
                    >
                      נקה סינון
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <div className="text-center py-12">טוען...</div>
          ) : filteredLessons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                אין שיעורים להצגה. צור שיעור חדש כדי להתחיל.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>נוכחות תלמידים</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-background z-20">
                        <tr className="border-b bg-accent/30">
                          <th className="text-right p-2 font-semibold sticky right-0 bg-background z-30 border-r min-w-[100px]">
                            תלמיד
                          </th>
                        {filteredLessons.map((lesson) => {
                          const isSorted = sortState?.lessonId === lesson.id;
                          const sortOrder = isSorted ? sortState.order : null;
                          
                          return (
                            <th
                              key={lesson.id}
                              className={cn(
                                "text-center p-2 font-semibold min-w-[90px] whitespace-nowrap text-xs relative group cursor-pointer select-none",
                                isSorted && "bg-accent/50"
                              )}
                              onClick={() => handleColumnClick(lesson.id)}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>{format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he })}</span>
                                {sortOrder && (
                                  <span className="text-xs text-muted-foreground">
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" dir="rtl">
                                    <DropdownMenuItem
                                      onClick={() => handleEditLesson(lesson)}
                                    >
                                      <Edit className="ml-2 h-4 w-4" />
                                      ערוך
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteLesson(lesson.id, lesson.lesson_date)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="ml-2 h-4 w-4" />
                                      מחק
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </th>
                          );
                        })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="border-b hover:bg-accent/30 transition-colors"
                          >
                            <td className="text-right p-2 font-medium sticky right-0 bg-background z-10 border-r">
                              <span className="text-sm">{student.name}</span>
                            </td>
                            {filteredLessons.map((lesson) => {
                              const key = `${lesson.id}-${student.id}`;
                              const record = attendanceMap[key];
                              const attended = record?.attended || false;
                              const note = record?.note || "";
                              const hasNote = note && note.trim().length > 0;

                              return (
                                <td key={lesson.id} className="p-2">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Checkbox
                                      checked={attended}
                                      onCheckedChange={(checked) =>
                                        handleAttendanceChange(
                                          lesson.id,
                                          student.id,
                                          checked === true
                                        )
                                      }
                                      className="h-4 w-4"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenNoteModal(
                                          lesson.id,
                                          student.id,
                                          student.name,
                                          lesson.lesson_date
                                        )
                                      }
                                      className={cn(
                                        "p-1 rounded-md transition-colors",
                                        hasNote
                                          ? "text-primary hover:bg-primary/10"
                                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                      )}
                                      title={hasNote ? "ערוך הערה" : "הוסף הערה"}
                                    >
                                      {hasNote ? (
                                        <MessageSquare className="h-3.5 w-3.5 fill-primary text-primary" />
                                      ) : (
                                        <StickyNote className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />

      {/* Note Modal */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>הערה עבור {currentNoteData?.studentName}</DialogTitle>
            <DialogDescription>
              תאריך השיעור: {currentNoteData && format(new Date(currentNoteData.lessonDate), "dd/MM/yyyy", { locale: he })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="הוסף הערה..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="min-h-[120px] resize-none"
              dir="rtl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveNote}>
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Modal */}
      <Dialog open={editLessonModalOpen} onOpenChange={setEditLessonModalOpen}>
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
              value={editLessonDate}
              onChange={setEditLessonDate}
              wrapperClassName="mt-1"
              autoOpenOnFocus={false}
              autoOpen={editLessonModalOpen}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditLessonModalOpen(false);
              setCurrentLessonToEdit(null);
              setEditLessonDate(null);
            }}>
              ביטול
            </Button>
            <Button onClick={handleSaveEditLesson}>
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Modal */}
      <Dialog open={deleteLessonModalOpen} onOpenChange={setDeleteLessonModalOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת שיעור</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את השיעור מתאריך{" "}
              {lessonToDelete && format(new Date(lessonToDelete.date), "dd/MM/yyyy", { locale: he })}?
              <br />
              <span className="text-destructive font-semibold mt-2 block">
                פעולה זו תמחק גם את כל רשומות הנוכחות הקשורות לשיעור זה ולא ניתן לבטל אותה.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteLessonModalOpen(false);
              setLessonToDelete(null);
            }}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteLesson}>
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
