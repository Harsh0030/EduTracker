import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  BarChart3, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  Loader2,
  Search,
  FileText
} from 'lucide-react';
import Picker from '../components/Picker';
import { studentService, attendanceService, subjectService } from '../services/dataService';
import { Student, AttendanceRecord, Subject } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSaturday, 
  isSunday,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isAfter,
  isBefore
} from 'date-fns';
import toast from 'react-hot-toast';

type ViewState = 'standards' | 'divisions' | 'students' | 'details';

const StudentDetails: React.FC = () => {
  const [view, setView] = useState<ViewState>('standards');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const unsubscribe = subjectService.subscribeToSubjects((data) => {
      setSubjects(data);
    });
    return unsubscribe;
  }, []);

  const availableSubjects = useMemo(() => {
    if (!selectedStudent) return ['All'];
    
    // Subjects from the subject service for this division
    const divSubjects = subjects
      .filter(s => s.standard === selectedStudent.standard && s.division === selectedStudent.division)
      .map(s => s.name);
      
    // Subjects that actually have attendance records for this student
    const attendanceSubjects = Array.from(new Set(attendance.map(r => r.subject)));
    
    const combined = Array.from(new Set([...divSubjects, ...attendanceSubjects]))
      .filter(s => typeof s === 'string' && s.trim() !== '' && s !== 'All')
      .sort();
      
    return ['All', ...combined];
  }, [subjects, selectedStudent, attendance]);

  const filteredAttendance = useMemo(() => {
    if (selectedSubject === 'All') return attendance;
    return attendance.filter(r => r.subject === selectedSubject);
  }, [attendance, selectedSubject]);

  useEffect(() => {
    const unsubscribe = studentService.subscribeToStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const standards = useMemo(() => {
    const uniqueStandards = Array.from(new Set(students.map(s => s.standard))).filter(s => s && s.trim() !== '').sort();
    return uniqueStandards;
  }, [students]);

  const divisions = useMemo(() => {
    if (!selectedStandard) return [];
    const filtered = students.filter(s => s.standard === selectedStandard);
    const uniqueDivisions = Array.from(new Set(filtered.map(s => s.division))).filter(s => s && s.trim() !== '').sort();
    return uniqueDivisions;
  }, [students, selectedStandard]);

  const filteredStudents = useMemo(() => {
    if (!selectedStandard || !selectedDivision) return [];
    return students.filter(s => 
      s.standard === selectedStandard && 
      s.division === selectedDivision && 
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       s.rollNumber.includes(searchQuery))
    );
  }, [students, selectedStandard, selectedDivision, searchQuery]);

  const fetchAttendance = async (studentId: string) => {
    setLoading(true);
    try {
      const start = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date()), 'yyyy-MM-dd');
      const data = await attendanceService.getAttendanceForStudent(studentId, start, end);
      setAttendance(data || []);
    } catch (err) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStandardSelect = (standard: string) => {
    setSelectedStandard(standard);
    setView('divisions');
  };

  const handleDivisionSelect = (division: string) => {
    setSelectedDivision(division);
    setView('students');
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    fetchAttendance(student.id);
    setView('details');
  };

  const handleBack = () => {
    if (view === 'details') setView('students');
    else if (view === 'students') setView('divisions');
    else if (view === 'divisions') setView('standards');
  };

  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthRecords = filteredAttendance.filter(r => {
      const date = new Date(r.date);
      return !isBefore(date, monthStart) && !isAfter(date, monthEnd);
    });

    let present = 0;
    let absent = 0;

    if (selectedSubject === 'All') {
      const uniqueDates = Array.from(new Set(monthRecords.map(r => r.date)));
      uniqueDates.forEach(date => {
        const recordsForDay = monthRecords.filter(r => r.date === date);
        const isPresent = recordsForDay.some(r => r.status === 'present');
        if (isPresent) present++;
        else absent++;
      });
    } else {
      present = monthRecords.filter(r => r.status === 'present').length;
      absent = monthRecords.filter(r => r.status === 'absent').length;
    }

    const total = present + absent;
    const percentage = total > 0 ? (present / total) * 100 : 0;

    return { present, absent, total, percentage };
  }, [filteredAttendance, currentMonth, selectedSubject]);

  const yearlyStats = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfYear(new Date()),
      end: endOfYear(new Date())
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthRecords = filteredAttendance.filter(r => {
        const date = new Date(r.date);
        return !isBefore(date, monthStart) && !isAfter(date, monthEnd);
      });

      let present = 0;
      let absent = 0;

      if (selectedSubject === 'All') {
        const uniqueDates = Array.from(new Set(monthRecords.map(r => r.date)));
        uniqueDates.forEach(date => {
          const recordsForDay = monthRecords.filter(r => r.date === date);
          const isPresent = recordsForDay.some(r => r.status === 'present');
          if (isPresent) present++;
          else absent++;
        });
      } else {
        present = monthRecords.filter(r => r.status === 'present').length;
        absent = monthRecords.filter(r => r.status === 'absent').length;
      }

      const total = present + absent;
      const percentage = total > 0 ? (present / total) * 100 : 0;

      return {
        month: format(month, 'MMMM'),
        present,
        absent,
        total,
        percentage
      };
    });
  }, [filteredAttendance, selectedSubject]);

  if (loading && view === 'standards') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading student data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center gap-4">
        {view !== 'standards' && (
          <button 
            onClick={handleBack}
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 hover:text-red-600 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {view === 'standards' ? 'Student Details' : 
             view === 'divisions' ? `Std ${selectedStandard}` :
             view === 'students' ? `Std ${selectedStandard} - Div ${selectedDivision}` : 
             selectedStudent?.name}
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            {view === 'standards' ? 'Select a standard to view divisions' : 
             view === 'divisions' ? 'Select a division to view students' :
             view === 'students' ? 'Select a student to view attendance' : 
             `Roll No: ${selectedStudent?.rollNumber} | Std: ${selectedStudent?.standard} | Div: ${selectedStudent?.division}`}
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'standards' && (
          <motion.div 
            key="standards"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {standards.map((std) => (
              <button
                key={std}
                onClick={() => handleStandardSelect(std)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-500">Standard</p>
                    <p className="text-xl font-bold text-gray-900">{std}</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-red-600 transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {view === 'divisions' && (
          <motion.div 
            key="divisions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => handleDivisionSelect(div)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-500">Division</p>
                    <p className="text-xl font-bold text-gray-900">{div}</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-red-600 transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {view === 'students' && (
          <motion.div 
            key="students"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none shadow-sm"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider w-32 border-r border-gray-200">Roll No</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-4 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <AnimatePresence mode="popLayout">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })).map((student, i) => (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleStudentSelect(student)}
                            className="hover:bg-red-50/50 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4 text-gray-700 font-medium border-r border-gray-200">{student.rollNumber}</td>
                            <td className="px-6 py-4 text-gray-900 font-bold group-hover:text-red-600 transition-colors">{student.name}</td>
                            <td className="px-6 py-4 text-right">
                              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-600 transition-colors inline-block" />
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Users className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No students found</h3>
                            <p className="text-gray-500 text-sm">Adjust your search to find students.</p>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'details' && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex bg-gray-50 p-1 rounded-2xl w-fit border border-gray-100">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    reportType === 'monthly' 
                      ? 'bg-white text-red-600 shadow-sm border border-gray-100' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Monthly View
                </button>
                <button
                  onClick={() => setReportType('yearly')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    reportType === 'yearly' 
                      ? 'bg-white text-red-600 shadow-sm border border-gray-100' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Yearly View
                </button>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Picker
                  label="Subject"
                  value={selectedSubject}
                  options={availableSubjects}
                  onChange={(sub) => setSelectedSubject(sub)}
                  icon={<FileText className="w-5 h-5" />}
                  placeholder="Select Subject"
                />
              </div>
            </div>

            {reportType === 'monthly' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <button 
                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-red-600" />
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <button 
                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-500 mb-1">Attendance Rate</p>
                    <p className="text-3xl font-bold text-gray-900">{monthlyStats.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-500 mb-1">Days Present</p>
                    <p className="text-3xl font-bold text-emerald-600">{monthlyStats.present}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-500 mb-1">Days Absent</p>
                    <p className="text-3xl font-bold text-red-600">{monthlyStats.absent}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const start = startOfMonth(currentMonth);
                      const end = endOfMonth(currentMonth);
                      const days = eachDayOfInterval({ start, end });
                      
                      // Padding for first day of month
                      const padding = Array.from({ length: start.getDay() });
                      
                      return [
                        ...padding.map((_, i) => <div key={`pad-${i}`} />),
                        ...days.map(day => {
                          const isWeekend = isSaturday(day) || isSunday(day);
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const recordsForDay = filteredAttendance.filter(r => r.date === dateStr);
                          
                          let status: 'present' | 'absent' | null = null;
                          if (recordsForDay.length > 0) {
                            if (selectedSubject === 'All') {
                              status = recordsForDay.some(r => r.status === 'present') ? 'present' : 'absent';
                            } else {
                              status = recordsForDay[0].status;
                            }
                          }
                          
                          return (
                            <div 
                              key={day.toISOString()}
                              className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all ${
                                isWeekend ? 'bg-gray-50 border-gray-100' : 
                                status === 'present' ? 'bg-emerald-50 border-emerald-200 shadow-sm' :
                                status === 'absent' ? 'bg-red-50 border-red-200 shadow-sm' :
                                'bg-white border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <span className={`text-sm font-bold ${
                                isWeekend ? 'text-gray-400' : 'text-gray-900'
                              }`}>
                                {format(day, 'd')}
                              </span>
                              {isWeekend ? (
                                <span className="text-[8px] font-bold text-gray-400 uppercase">Closed</span>
                              ) : status ? (
                                status === 'present' ? 
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : 
                                <XCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <MinusCircle className="w-4 h-4 text-gray-200" />
                              )}
                            </div>
                          );
                        })
                      ];
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {yearlyStats.map((stat) => (
                  <div 
                    key={stat.month}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{stat.month}</h4>
                      <p className="text-sm text-gray-500 font-medium">
                        {stat.present} Present | {stat.absent} Absent
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        stat.percentage >= 75 ? 'text-emerald-600' : 
                        stat.percentage >= 50 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {stat.percentage.toFixed(1)}%
                      </p>
                      <div className="w-32 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            stat.percentage >= 75 ? 'bg-emerald-500' : 
                            stat.percentage >= 50 ? 'bg-blue-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDetails;
