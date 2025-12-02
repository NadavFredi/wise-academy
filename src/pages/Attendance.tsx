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
  useUpdateAttendanceMutation,
} from "@/store/api/attendanceApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, StickyNote, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { DatePickerInput } from "@/components/DatePickerInput";
import { AutocompleteFilter } from "@/components/AutocompleteFilter";

const Attendance = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { selectedCohortId, selectedDates } = useAppSelector((state) => state.attendance);
  
  const [newLessonDate, setNewLessonDate] = useState<Date | null>(new Date());
  const [dateFilterValue, setDateFilterValue] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentNoteData, setCurrentNoteData] = useState<{
    lessonId: string;
    studentId: string;
    studentName: string;
    lessonDate: string;
    note: string;
  } | null>(null);
  const [noteInput, setNoteInput] = useState("");

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

  // Filter lessons by selected dates
  const filteredLessons = useMemo(() => {
    if (selectedDates.length === 0) return lessons;
    return lessons.filter((lesson) => selectedDates.includes(lesson.lesson_date));
  }, [lessons, selectedDates]);

  // Date filter search function
  const dateSearchFn = async (searchTerm: string): Promise<string[]> => {
    if (!searchTerm) {
      return lessons.map((l) => format(new Date(l.lesson_date), "dd/MM/yyyy", { locale: he }));
    }
    const searchLower = searchTerm.toLowerCase();
    return lessons
      .map((l) => ({
        date: l.lesson_date,
        formatted: format(new Date(l.lesson_date), "dd/MM/yyyy", { locale: he }),
      }))
      .filter((item) => item.formatted.includes(searchLower))
      .map((item) => item.formatted);
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

  const handleDateSelect = (formattedDate: string) => {
    // Find the lesson date that matches the formatted date
    const lesson = lessons.find((l) => {
      const formatted = format(new Date(l.lesson_date), "dd/MM/yyyy", { locale: he });
      return formatted === formattedDate;
    });
    if (lesson) {
      dispatch(toggleDate(lesson.lesson_date));
      setDateFilterValue("");
    }
  };

  const loading = studentsLoading || lessonsLoading || attendanceLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex-1">
        <div className="border-b bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">מערכת נוכחות</h1>
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

            {/* Date Filter with Autocomplete */}
            {lessons.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">סינון תאריכים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <AutocompleteFilter
                      value={dateFilterValue}
                      onChange={setDateFilterValue}
                      onSelect={handleDateSelect}
                      placeholder="חפש תאריך..."
                      searchFn={dateSearchFn}
                      minSearchLength={0}
                      autoSearchOnFocus={true}
                      initialLoadOnMount={true}
                      initialResultsLimit={10}
                    />
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {lessons.map((lesson) => {
                        const isSelected = selectedDates.includes(lesson.lesson_date);
                        return (
                          <Button
                            key={lesson.id}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => dispatch(toggleDate(lesson.lesson_date))}
                            className="text-xs px-2 py-1 h-7"
                          >
                            {format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he })}
                          </Button>
                        );
                      })}
                      {selectedDates.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dispatch(clearSelectedDates())}
                          className="text-xs px-2 py-1 h-7"
                        >
                          נקה
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">סינון תאריכים</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">אין שיעורים זמינים</p>
                </CardContent>
              </Card>
            )}
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
                          {filteredLessons.map((lesson) => (
                            <th
                              key={lesson.id}
                              className="text-center p-2 font-semibold min-w-[90px] whitespace-nowrap text-xs"
                            >
                              {format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
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
    </div>
  );
};

export default Attendance;
