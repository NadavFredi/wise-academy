import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, LogOut, Filter } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import Footer from "@/components/Footer";

interface Student {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  lesson_date: string;
}

interface AttendanceRecord {
  id?: string;
  lesson_id: string;
  student_id: string;
  attended: boolean;
  note: string;
}

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cohortId, setCohortId] = useState<string>("00000000-0000-0000-0000-000000000001");
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [newLessonDate, setNewLessonDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check authentication
    const session = localStorage.getItem("admin_session");
    if (!session) {
      navigate("/login");
      return;
    }

    loadData();
  }, [cohortId, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .eq("cohort_id", cohortId)
        .order("name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Load lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("cohort_id", cohortId)
        .order("lesson_date", { ascending: false });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Load attendance records
      if (lessonsData && lessonsData.length > 0) {
        const lessonIds = lessonsData.map((l) => l.id);
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("*")
          .in("lesson_id", lessonIds);

        if (attendanceError) throw attendanceError;

        // Create attendance map: "lesson_id-student_id" -> attendance record
        const attendanceMap: Record<string, AttendanceRecord> = {};
        (attendanceData || []).forEach((record) => {
          const key = `${record.lesson_id}-${record.student_id}`;
          attendanceMap[key] = record;
        });
        setAttendance(attendanceMap);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!newLessonDate) {
      toast({
        title: "שגיאה",
        description: "אנא בחר תאריך",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("lessons")
        .insert({
          cohort_id: cohortId,
          lesson_date: newLessonDate,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: "שיעור חדש נוצר בהצלחה",
      });

      setNewLessonDate("");
      await loadData();
    } catch (error: any) {
      console.error("Error creating lesson:", error);
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
    const key = `${lessonId}-${studentId}`;
    const existing = attendance[key];

    try {
      if (existing?.id) {
        // Update existing
        const { error } = await supabase
          .from("attendance")
          .update({ attended, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            lesson_id: lessonId,
            student_id: studentId,
            attended,
          })
          .select()
          .single();

        if (error) throw error;
        setAttendance((prev) => ({
          ...prev,
          [key]: data,
        }));
        return;
      }

      // Update local state
      setAttendance((prev) => ({
        ...prev,
        [key]: { ...existing, attended },
      }));
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון הנוכחות",
        variant: "destructive",
      });
    }
  };

  const handleNoteChange = async (
    lessonId: string,
    studentId: string,
    note: string
  ) => {
    const key = `${lessonId}-${studentId}`;
    const existing = attendance[key];

    try {
      if (existing?.id) {
        const { error } = await supabase
          .from("attendance")
          .update({ note, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            lesson_id: lessonId,
            student_id: studentId,
            attended: false,
            note,
          })
          .select()
          .single();

        if (error) throw error;
        setAttendance((prev) => ({
          ...prev,
          [key]: data,
        }));
        return;
      }

      setAttendance((prev) => ({
        ...prev,
        [key]: { ...existing, note },
      }));
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    navigate("/login");
  };

  const filteredLessons = selectedDates.length > 0
    ? lessons.filter((lesson) => selectedDates.includes(lesson.lesson_date))
    : lessons;

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
          {/* Cohort Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>בחירת Cohort</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger className="w-full md:w-[300px]">
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                יצירת שיעור חדש
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="lesson-date">תאריך השיעור</Label>
                  <Input
                    id="lesson-date"
                    type="date"
                    value={newLessonDate}
                    onChange={(e) => setNewLessonDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateLesson}>
                    <Calendar className="ml-2 h-4 w-4" />
                    צור שיעור
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Filter */}
          {lessons.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  סינון תאריכים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lessons.map((lesson) => (
                    <Button
                      key={lesson.id}
                      variant={selectedDates.includes(lesson.lesson_date) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedDates((prev) =>
                          prev.includes(lesson.lesson_date)
                            ? prev.filter((d) => d !== lesson.lesson_date)
                            : [...prev, lesson.lesson_date]
                        );
                      }}
                    >
                      {format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he })}
                    </Button>
                  ))}
                  {selectedDates.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDates([])}
                    >
                      נקה סינון
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-accent/30">
                        <th className="text-right p-4 font-semibold sticky right-0 bg-background z-10 border-r">
                          תלמיד
                        </th>
                        {filteredLessons.map((lesson) => (
                          <th
                            key={lesson.id}
                            className="text-center p-4 font-semibold min-w-[180px] whitespace-nowrap"
                          >
                            {format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-b hover:bg-accent/30 transition-colors">
                          <td className="text-right p-4 font-medium sticky right-0 bg-background z-10 border-r">
                            {student.name}
                          </td>
                          {filteredLessons.map((lesson) => {
                            const key = `${lesson.id}-${student.id}`;
                            const record = attendance[key];
                            const attended = record?.attended || false;
                            const note = record?.note || "";

                            return (
                              <td key={lesson.id} className="p-3 align-top">
                                <div className="flex flex-col gap-3 items-center min-w-[150px]">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={attended}
                                      onCheckedChange={(checked) =>
                                        handleAttendanceChange(
                                          lesson.id,
                                          student.id,
                                          checked === true
                                        )
                                      }
                                      className="h-5 w-5"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {attended ? "הגיע" : "לא הגיע"}
                                    </span>
                                  </div>
                                  <Textarea
                                    placeholder="הערה..."
                                    value={note}
                                    onChange={(e) =>
                                      handleNoteChange(
                                        lesson.id,
                                        student.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full min-h-[60px] text-sm resize-none"
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Attendance;

