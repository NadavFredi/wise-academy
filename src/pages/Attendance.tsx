import { useState, useEffect, useMemo, useRef } from "react";
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
  useCreateMultipleLessonsMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useUpdateAttendanceMutation,
  useBulkUpdateAttendanceMutation,
  useSyncAllMutation,
  type Lesson,
} from "@/store/api/attendanceApi";
import { useGetCohortsQuery } from "@/store/api/cohortsApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, StickyNote, MessageSquare, MoreVertical, Edit, Trash2, RefreshCw, Save, Calendar } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { he } from "date-fns/locale/he";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { DatePickerInput } from "@/components/DatePickerInput";
import { AutocompleteFilter } from "@/components/AutocompleteFilter";
import wiseLogo from "@/assets/icons/wise-logo.webp";
import { supabase } from "@/lib/supabase";
import { NoteDialog } from "@/components/dialogs/NoteDialog";
import { EditLessonDialog } from "@/components/dialogs/EditLessonDialog";
import { DeleteLessonDialog } from "@/components/dialogs/DeleteLessonDialog";
import { ChartDateDetailsDialog } from "@/components/dialogs/ChartDateDetailsDialog";
import { MultipleLessonsDialog } from "@/components/dialogs/MultipleLessonsDialog";
import { AttendanceChart } from "@/components/graphs/AttendanceChart";
import { StudentAttendanceBarChart } from "@/components/graphs/StudentAttendanceBarChart";
import { StudentPercentageChart } from "@/components/graphs/StudentPercentageChart";

const Attendance = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { selectedCohortId, selectedDates } = useAppSelector((state) => state.attendance);

  const [newLessonDate, setNewLessonDate] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(subMonths(new Date(), 2));
  const [endDate, setEndDate] = useState<Date | null>(addMonths(new Date(), 2));
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentFilterValue, setStudentFilterValue] = useState("");
  const [cohortFilterValue, setCohortFilterValue] = useState("");
  const [localCohortId, setLocalCohortId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("data");
  const [chartDateModalOpen, setChartDateModalOpen] = useState(false);
  const [selectedChartDateData, setSelectedChartDateData] = useState<{
    date: string;
    lessonId: string;
  } | null>(null);
  const [chartModalFilter, setChartModalFilter] = useState<'all' | 'attended' | 'absent'>('all');
  const [selectedStudentGraph, setSelectedStudentGraph] = useState<'attendance' | 'absence' | 'percentage' | null>(null);
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
  const [cohortFilterRefreshKey, setCohortFilterRefreshKey] = useState(0);
  const justSyncedRef = useRef(false);
  const [multipleLessonsModalOpen, setMultipleLessonsModalOpen] = useState(false);
  const [multipleLessonDates, setMultipleLessonDates] = useState<(Date | null)[]>([]);

  // Local state for pending attendance changes
  const [pendingAttendanceChanges, setPendingAttendanceChanges] = useState<
    Record<string, { attended: boolean; note?: string }>
  >({});

  // RTK Query hooks
  const { data: students = [], isLoading: studentsLoading } = useGetStudentsQuery(
    selectedCohortId || "",
    { skip: !selectedCohortId }
  );

  const { data: lessons = [], isLoading: lessonsLoading } = useGetLessonsQuery(
    localCohortId || "",
    { skip: !localCohortId }
  );

  const lessonIds = useMemo(() => lessons.map((l) => l.id), [lessons]);
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useGetAttendanceQuery(
    lessonIds,
    { skip: lessonIds.length === 0 }
  );

  const { data: cohorts = [], isLoading: cohortsLoading, refetch: refetchCohorts } = useGetCohortsQuery();

  // Use a ref to always have the latest cohorts for the search function
  const cohortsRef = useRef(cohorts);
  useEffect(() => {
    cohortsRef.current = cohorts;
  }, [cohorts]);

  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();
  const [createMultipleLessons, { isLoading: creatingMultipleLessons }] = useCreateMultipleLessonsMutation();
  const [updateLesson] = useUpdateLessonMutation();
  const [deleteLesson] = useDeleteLessonMutation();
  const [updateAttendance] = useUpdateAttendanceMutation();
  const [bulkUpdateAttendance, { isLoading: savingBulk }] = useBulkUpdateAttendanceMutation();
  const [syncAll, { isLoading: syncing }] = useSyncAllMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Refresh autocomplete filter when cohorts are updated after sync
  useEffect(() => {
    if (justSyncedRef.current && !cohortsLoading && cohorts.length > 0) {
      // Cohorts have been updated after sync, refresh the filter to show updated results
      setCohortFilterRefreshKey((prev) => prev + 1);
      justSyncedRef.current = false;
    }
  }, [cohortsLoading, cohorts]);

  // Sync cohort filter value with selected cohort (no sync here - only when selected)
  useEffect(() => {
    if (selectedCohortId && cohorts.length > 0) {
      const selectedCohort = cohorts.find((c) => c.customobject1004id === selectedCohortId);
      if (selectedCohort) {
        // Use getCohortDisplayName for consistency
        const displayName = getCohortDisplayName(selectedCohort);
        setCohortFilterValue(displayName);
      }
    } else if (!selectedCohortId) {
      setCohortFilterValue("");
      setLocalCohortId(null);
      // Clear pending changes when cohort is deselected
      setPendingAttendanceChanges({});
    }
  }, [selectedCohortId, cohorts]);

  // Clear pending changes when cohort changes
  useEffect(() => {
    if (localCohortId) {
      setPendingAttendanceChanges({});
    }
  }, [localCohortId]);

  // Fetch local cohort ID if cohort is selected but local ID is missing (e.g., after page refresh)
  useEffect(() => {
    // Only run if we have a selectedCohortId and don't have a localCohortId yet
    if (!selectedCohortId || localCohortId) {
      return;
    }

    const fetchLocalCohortId = async () => {
      try {
        const { data, error } = await supabase
          .from('cohorts')
          .select('id')
          .eq('fireberry_id', selectedCohortId)
          .maybeSingle(); // Use maybeSingle to avoid 406 error when not found

        if (error) {
          // Check if it's a "not found" error (PGRST116)
          if (error.code === 'PGRST116') {
            console.log('Cohort not found in local DB');
            return;
          }
          // For other errors, log them
          console.error('Error fetching local cohort ID:', error);
          return;
        }

        if (data) {
          setLocalCohortId(data.id);
        }
      } catch (error) {
        console.error('Error fetching local cohort ID:', error);
      }
    };

    fetchLocalCohortId();
  }, [selectedCohortId, localCohortId]);

  // Create attendance map, merging server data with pending changes
  const attendanceMap = useMemo(() => {
    const map: Record<string, { attended: boolean; note: string }> = {};
    attendanceRecords.forEach((record) => {
      // Use :: as separator since UUIDs contain dashes
      const key = `${record.lesson_id}::${record.student_id}`;
      map[key] = {
        attended: record.attended,
        note: record.note || "",
      };
    });

    // Override with pending changes
    Object.entries(pendingAttendanceChanges).forEach(([key, change]) => {
      map[key] = {
        attended: change.attended,
        note: change.note || "",
      };
    });

    return map;
  }, [attendanceRecords, pendingAttendanceChanges]);

  // Check if there are pending changes
  const hasPendingChanges = useMemo(() => {
    return Object.keys(pendingAttendanceChanges).length > 0;
  }, [pendingAttendanceChanges]);

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

  // Filter students by selected student IDs
  const filteredStudents = useMemo(() => {
    if (selectedStudentIds.length === 0) return students;
    return students.filter((student) => selectedStudentIds.includes(student.id));
  }, [students, selectedStudentIds]);

  // Sort students by attendance status for selected date
  const sortedStudents = useMemo(() => {
    if (!sortState) return filteredStudents;

    const lesson = filteredLessons.find((l) => l.id === sortState.lessonId);
    if (!lesson) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      // Use :: as separator since UUIDs contain dashes
      const keyA = `${lesson.id}::${a.id}`;
      const keyB = `${lesson.id}::${b.id}`;
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
  }, [filteredStudents, sortState, filteredLessons, attendanceMap]);

  // Prepare student graphs data
  const studentGraphsData = useMemo(() => {
    const studentsToCount = selectedStudentIds.length > 0
      ? filteredStudents
      : students;

    const data = studentsToCount.map((student) => {
      let totalAttended = 0;
      let totalAbsent = 0;

      filteredLessons.forEach((lesson) => {
        const attendanceRecord = attendanceRecords.find(
          (r) => r.lesson_id === lesson.id && r.student_id === student.id
        );

        if (attendanceRecord && attendanceRecord.attended) {
          totalAttended++;
        } else {
          totalAbsent++;
        }
      });

      const total = totalAttended + totalAbsent;
      const percentage = total > 0 ? Math.round((totalAttended / total) * 100) : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        totalAttended,
        totalAbsent,
        percentage,
      };
    });

    // Sort by total attendance (descending)
    return data.sort((a, b) => b.totalAttended - a.totalAttended);
  }, [filteredLessons, attendanceRecords, selectedStudentIds, filteredStudents, students]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const dates = filteredLessons.map((lesson) => format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he }));
    const attendedData: number[] = [];
    const absentData: number[] = [];

    filteredLessons.forEach((lesson) => {
      // Get students to count (filtered or all)
      const studentsToCount = selectedStudentIds.length > 0
        ? filteredStudents
        : students;

      let attended = 0;
      let absent = 0;

      studentsToCount.forEach((student) => {
        const attendanceRecord = attendanceRecords.find(
          (record) => record.lesson_id === lesson.id && record.student_id === student.id
        );

        if (attendanceRecord) {
          // If there's a record, check if attended
          if (attendanceRecord.attended) {
            attended++;
          } else {
            absent++;
          }
        } else {
          // If no record exists, student is absent (missing)
          absent++;
        }
      });

      attendedData.push(attended);
      absentData.push(absent);
    });

    return { dates, attendedData, absentData };
  }, [filteredLessons, attendanceRecords, selectedStudentIds, filteredStudents, students]);

  // Student filter search function
  const studentSearchFn = async (searchTerm: string): Promise<string[]> => {
    if (!searchTerm) {
      return students.map((s) => s.name);
    }
    const searchLower = searchTerm.toLowerCase();
    return students
      .filter((s) => s.name.toLowerCase().includes(searchLower))
      .map((s) => s.name);
  };

  const handleStudentSelect = (studentName: string) => {
    const student = students.find((s) => s.name === studentName);
    if (student && !selectedStudentIds.includes(student.id)) {
      setSelectedStudentIds([...selectedStudentIds, student.id]);
      setStudentFilterValue("");
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
  };

  // Helper function to get cohort display name
  const getCohortDisplayName = (cohort: { name: string; pcfCoursename?: string }) => {
    // If pcfCoursename exists (for compatibility), use it, otherwise just use name
    return cohort.pcfCoursename
      ? `${cohort.name} - ${cohort.pcfCoursename}`
      : cohort.name;
  };

  // Cohort filter search function - uses ref to always get latest cohorts
  const cohortSearchFn = async (searchTerm: string): Promise<string[]> => {
    const currentCohorts = cohortsRef.current;
    if (!currentCohorts || currentCohorts.length === 0) {
      return [];
    }
    if (!searchTerm) {
      return currentCohorts.map((c) => getCohortDisplayName(c));
    }
    const searchLower = searchTerm.toLowerCase();
    return currentCohorts
      .filter((c) => {
        const displayName = getCohortDisplayName(c);
        return displayName.toLowerCase().includes(searchLower);
      })
      .map((c) => getCohortDisplayName(c));
  };

  const handleCohortSelect = async (cohortDisplayName: string) => {
    const cohort = cohorts.find((c) => getCohortDisplayName(c) === cohortDisplayName);
    if (!cohort) {
      return;
    }

    // Get the local cohort ID from Supabase
    try {
      const { data, error } = await supabase
        .from('cohorts')
        .select('id')
        .eq('fireberry_id', cohort.customobject1004id)
        .maybeSingle(); // Use maybeSingle to avoid 406 error when not found

      if (error) {
        // Check if it's a "not found" error
        if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
          toast({
            title: "שגיאה",
            description: "מחזור לא נמצא במערכת. אנא בצע סנכרון תחילה.",
            variant: "destructive",
          });
          return;
        }
        // For other errors
        console.error('Error fetching cohort:', error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בטעינת המחזור",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "שגיאה",
          description: "מחזור לא נמצא במערכת. אנא בצע סנכרון תחילה.",
          variant: "destructive",
        });
        return;
      }

      setLocalCohortId(data.id);
      dispatch(setSelectedCohort(cohort.customobject1004id));
      setCohortFilterValue(cohortDisplayName);
    } catch (error) {
      console.error('Error fetching cohort:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המחזור",
        variant: "destructive",
      });
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncAll().unwrap();
      toast({
        title: "הצלחה",
        description: result.message || `נסנכרנו ${result.cohortsSynced} מחזורים ו-${result.studentsSynced} תלמידים`,
      });
      // Mark that we just synced
      justSyncedRef.current = true;
      // Explicitly refetch cohorts to ensure we have the latest data
      const { data: updatedCohorts } = await refetchCohorts();
      // Update the ref immediately with the fresh data
      if (updatedCohorts) {
        cohortsRef.current = updatedCohorts;
      }
      // Then refresh the autocomplete filter to show updated results
      setCohortFilterRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בסנכרון הנתונים",
        variant: "destructive",
      });
    }
  };

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
    if (!newLessonDate || !localCohortId) {
      toast({
        title: "שגיאה",
        description: !localCohortId ? "אנא בחר מחזור" : "אנא בחר תאריך",
        variant: "destructive",
      });
      return;
    }

    try {
      const dateString = format(newLessonDate, "yyyy-MM-dd");
      await createLesson({
        cohortId: localCohortId,
        lessonDate: dateString,
      }).unwrap();

      toast({
        title: "הצלחה",
        description: "שיעור חדש נוצר בהצלחה",
      });

      setNewLessonDate(null);
    } catch (error: any) {
      // Check if it's a duplicate key error
      const isDuplicateError =
        error?.code === '23505' ||
        error?.message?.includes('duplicate key') ||
        error?.message?.includes('lessons_cohort_id_lesson_date_key') ||
        error?.details?.includes('lessons_cohort_id_lesson_date_key');

      toast({
        title: "שגיאה",
        description: isDuplicateError
          ? "השיעור כבר קיים במערכת"
          : (error.message || "אירעה שגיאה ביצירת השיעור"),
        variant: "destructive",
      });
    }
  };

  const handleAddRow = () => {
    setMultipleLessonDates([...multipleLessonDates, null]);
  };

  const handleRemoveDateFromMultiple = (index: number) => {
    setMultipleLessonDates(multipleLessonDates.filter((_, i) => i !== index));
  };

  const handleUpdateDateInMultiple = (index: number, date: Date | null) => {
    const updatedDates = [...multipleLessonDates];
    updatedDates[index] = date;
    setMultipleLessonDates(updatedDates);
  };

  const handleCreateMultipleLessons = async () => {
    if (!localCohortId) {
      toast({
        title: "שגיאה",
        description: "אנא בחר מחזור",
        variant: "destructive",
      });
      return;
    }

    const validDates = multipleLessonDates.filter(date => date !== null) as Date[];

    if (validDates.length === 0) {
      toast({
        title: "שגיאה",
        description: "אנא מלא לפחות תאריך אחד",
        variant: "destructive",
      });
      return;
    }

    try {
      const dateStrings = validDates.map(date => format(date, "yyyy-MM-dd"));
      const result = await createMultipleLessons({
        cohortId: localCohortId,
        lessonDates: dateStrings,
      }).unwrap();

      const { created, skipped, errors } = result;

      let message = `נוצרו ${created.length} שיעורים בהצלחה`;
      if (skipped.length > 0) {
        message += `. ${skipped.length} תאריכים דילגו (כבר קיימים או כפולים)`;
      }
      if (errors.length > 0) {
        message += `. ${errors.length} שגיאות התרחשו`;
      }

      toast({
        title: created.length > 0 ? "הצלחה" : "הושלם עם אזהרות",
        description: message,
        variant: created.length === 0 ? "destructive" : "default",
      });

      if (created.length > 0) {
        setMultipleLessonDates([]);
        setMultipleLessonsModalOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה ביצירת השיעורים",
        variant: "destructive",
      });
    }
  };

  const handleAttendanceChange = (
    lessonId: string,
    studentId: string,
    attended: boolean
  ) => {
    // Use :: as separator since UUIDs contain dashes
    const key = `${lessonId}::${studentId}`;
    setPendingAttendanceChanges((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        attended,
        // Preserve note if it exists
        note: prev[key]?.note,
      },
    }));
  };

  const handleBulkSave = async () => {
    if (!hasPendingChanges) return;

    try {
      const updates = Object.entries(pendingAttendanceChanges).map(([key, change]) => {
        const [lessonId, studentId] = key.split('::');
        return {
          lessonId,
          studentId,
          attended: change.attended,
          note: change.note,
        };
      });

      await bulkUpdateAttendance(updates).unwrap();

      // Clear pending changes after successful save
      setPendingAttendanceChanges({});

      toast({
        title: "הצלחה",
        description: `נשמרו ${updates.length} עדכוני נוכחות בהצלחה`,
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת עדכוני הנוכחות",
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
    // Use :: as separator since UUIDs contain dashes
    const key = `${lessonId}::${studentId}`;
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

  const handleSaveNote = () => {
    if (!currentNoteData) return;

    // Use :: as separator since UUIDs contain dashes
    const key = `${currentNoteData.lessonId}::${currentNoteData.studentId}`;
    const current = attendanceMap[key];

    // Update pending changes with the note
    setPendingAttendanceChanges((prev) => ({
      ...prev,
      [key]: {
        attended: current?.attended || false,
        note: noteInput,
      },
    }));

    setNoteModalOpen(false);
    setCurrentNoteData(null);
    setNoteInput("");
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
          <div className="w-full mx-auto px-6 py-4 max-w-[1920px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={wiseLogo}
                  alt="Wise Logo"
                  className="h-20 w-auto"
                />
                <h1 className="text-2xl font-bold">מערכת נוכחות</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSyncAll}
                  disabled={syncing}
                >
                  <RefreshCw className={cn("ml-2 h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "מסנכרן..." : "סנכרן מחזורים"}
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="ml-2 h-4 w-4" />
                  התנתק
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full mx-auto px-6 py-6 max-w-[1920px]">
          {/* Four Cards in One Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Cohort Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">בחירת מחזור</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <AutocompleteFilter
                    value={cohortFilterValue}
                    onChange={setCohortFilterValue}
                    onSelect={handleCohortSelect}
                    placeholder={cohortsLoading ? "טוען..." : "חפש מחזור..."}
                    searchFn={cohortSearchFn}
                    minSearchLength={0}
                    autoSearchOnFocus={true}
                    initialLoadOnMount={true}
                    initialResultsLimit={10}
                    refreshKey={cohortFilterRefreshKey}
                  />
                  {selectedCohortId && cohortFilterValue && (
                    <p className="text-xs text-muted-foreground text-right" dir="rtl">
                      {cohortFilterValue}
                    </p>
                  )}
                </div>
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
                  <Button
                    onClick={() => setMultipleLessonsModalOpen(true)}
                    disabled={creatingLesson || !localCohortId}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    צור שיעורים מרובים
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
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="flex flex-col">
                      <Label htmlFor="start-date" className="text-sm mb-1">מתאריך</Label>
                      <DatePickerInput
                        value={startDate}
                        onChange={(newDate) => {
                          setStartDate(newDate)
                          // If new start date is after end date, clear end date
                          if (newDate && endDate) {
                            const newDateStart = new Date(newDate)
                            newDateStart.setHours(0, 0, 0, 0)
                            const endDateStart = new Date(endDate)
                            endDateStart.setHours(0, 0, 0, 0)
                            if (newDateStart > endDateStart) {
                              setEndDate(null)
                              toast({
                                title: "הודעה",
                                description: "תאריך ההתחלה שונה לאחר תאריך הסיום, תאריך הסיום נמחק",
                              })
                            }
                          }
                        }}
                        maxDate={endDate || undefined}
                        wrapperClassName="w-full"
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor="end-date" className="text-sm mb-1">עד תאריך</Label>
                      <DatePickerInput
                        value={endDate}
                        onChange={(newDate) => {
                          // Only allow setting end date if it's after or equal to start date
                          if (newDate && startDate) {
                            const newDateStart = new Date(newDate)
                            newDateStart.setHours(0, 0, 0, 0)
                            const startDateStart = new Date(startDate)
                            startDateStart.setHours(0, 0, 0, 0)
                            if (newDateStart < startDateStart) {
                              toast({
                                title: "שגיאה",
                                description: "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה",
                                variant: "destructive",
                              })
                              return // Don't allow setting end date before start date
                            }
                          }
                          setEndDate(newDate)
                        }}
                        minDate={startDate || undefined}
                        wrapperClassName="w-full"
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

            {/* Student Filter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">סינון תלמידים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AutocompleteFilter
                    value={studentFilterValue}
                    onChange={setStudentFilterValue}
                    onSelect={handleStudentSelect}
                    placeholder="חפש תלמיד..."
                    searchFn={studentSearchFn}
                    minSearchLength={0}
                    autoSearchOnFocus={true}
                    initialLoadOnMount={true}
                    initialResultsLimit={10}
                  />
                  {selectedStudentIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedStudentIds.map((studentId) => {
                        const student = students.find((s) => s.id === studentId);
                        return student ? (
                          <div
                            key={studentId}
                            className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                          >
                            <span>{student.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(studentId)}
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudentIds([])}
                        className="text-xs h-7"
                      >
                        נקה הכל
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-end mb-4">
              <TabsList dir="rtl">
                <TabsTrigger value="data">נתונים</TabsTrigger>
                <TabsTrigger value="graphs">גרפי כיתה</TabsTrigger>
                <TabsTrigger value="student-graphs">גרפי תלמידים</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="data">
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
                  <CardHeader className="text-right">
                    <CardTitle>נוכחות תלמידים</CardTitle>
                  </CardHeader>
                  <CardContent >
                    <div className="overflow-x-auto" dir="rtl">
                      <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full border-collapse" dir="rtl">
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
                                        <DropdownMenuContent align="end">
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
                                  // Use :: as separator since UUIDs contain dashes
                                  const key = `${lesson.id}::${student.id}`;
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
            </TabsContent>

            <TabsContent value="graphs">
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
                    <CardTitle>גרף נוכחות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AttendanceChart
                      lessons={filteredLessons}
                      dates={chartData.dates}
                      attendedData={chartData.attendedData}
                      absentData={chartData.absentData}
                      onDateClick={(lesson) => {
                        setSelectedChartDateData({
                          date: lesson.lesson_date,
                          lessonId: lesson.id,
                        });
                        setChartDateModalOpen(true);
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="student-graphs">
              {loading ? (
                <div className="text-center py-12">טוען...</div>
              ) : filteredLessons.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    אין שיעורים להצגה. צור שיעור חדש כדי להתחיל.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {/* Combined Attendance and Absence Graph */}
                  <Card>
                    <CardHeader className="text-right">
                      <CardTitle>נוכחויות והיעדרויות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <StudentAttendanceBarChart
                        data={studentGraphsData}
                        onStudentClick={(studentData, type) => {
                          setSelectedStudentGraph(type === 'attendance' ? 'attendance' : 'absence');
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Percentage of Presence Graph */}
                  <Card>
                    <CardHeader className="text-right">
                      <CardTitle>אחוז נוכחות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <StudentPercentageChart
                        data={studentGraphsData}
                        onStudentClick={(studentData) => {
                          setSelectedStudentGraph('percentage');
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Floating Save Button */}
        {hasPendingChanges && (
          <div className="sticky bottom-0 left-0 right-0 z-50 pb-6 pt-4 bg-background/95 backdrop-blur-sm border-t mt-6">
            <div className="w-full mx-auto px-6 max-w-[1920px]">
              <Button
                onClick={handleBulkSave}
                disabled={savingBulk}
                size="lg"
                className="shadow-lg"
              >
                <Save className="ml-2 h-5 w-5" />
                {savingBulk ? "שומר..." : `שמור שינויים (${Object.keys(pendingAttendanceChanges).length})`}
              </Button>
            </div>
          </div>
        )}
      </div>
      <Footer />

      <NoteDialog
        open={noteModalOpen}
        onOpenChange={setNoteModalOpen}
        studentName={currentNoteData?.studentName}
        lessonDate={currentNoteData?.lessonDate}
        note={noteInput}
        onNoteChange={setNoteInput}
        onSave={handleSaveNote}
      />

      <EditLessonDialog
        open={editLessonModalOpen}
        onOpenChange={setEditLessonModalOpen}
        lessonDate={editLessonDate}
        onLessonDateChange={setEditLessonDate}
        onSave={handleSaveEditLesson}
        onCancel={() => {
          setEditLessonModalOpen(false);
          setCurrentLessonToEdit(null);
          setEditLessonDate(null);
        }}
      />

      <DeleteLessonDialog
        open={deleteLessonModalOpen}
        onOpenChange={setDeleteLessonModalOpen}
        lessonDate={lessonToDelete?.date}
        onConfirm={handleConfirmDeleteLesson}
        onCancel={() => {
          setDeleteLessonModalOpen(false);
          setLessonToDelete(null);
        }}
      />

      <ChartDateDetailsDialog
        open={chartDateModalOpen}
        onOpenChange={(open) => {
          setChartDateModalOpen(open);
          if (!open) {
            setSelectedChartDateData(null);
            setChartModalFilter('all');
          }
        }}
        selectedDateData={selectedChartDateData}
        lesson={selectedChartDateData ? filteredLessons.find((l) => l.id === selectedChartDateData.lessonId) : undefined}
        students={selectedStudentIds.length > 0 ? filteredStudents : students}
        attendanceRecords={attendanceRecords}
        filter={chartModalFilter}
        onFilterChange={setChartModalFilter}
        onClose={() => {
          setChartDateModalOpen(false);
          setSelectedChartDateData(null);
          setChartModalFilter('all');
        }}
      />

      <MultipleLessonsDialog
        open={multipleLessonsModalOpen}
        onOpenChange={setMultipleLessonsModalOpen}
        dates={multipleLessonDates}
        onAddRow={handleAddRow}
        onRemoveDate={handleRemoveDateFromMultiple}
        onUpdateDate={handleUpdateDateInMultiple}
        onSave={handleCreateMultipleLessons}
        onCancel={() => {
          setMultipleLessonsModalOpen(false);
          setMultipleLessonDates([]);
        }}
        isCreating={creatingMultipleLessons}
      />
    </div>
  );
};

export default Attendance;
