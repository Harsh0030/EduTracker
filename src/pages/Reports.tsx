import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  Loader2,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  X,
  ArrowRight,
  Download,
  GraduationCap
} from 'lucide-react';
import Picker from '../components/Picker';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { studentService, attendanceService, subjectService } from '../services/dataService';
import { Student, AttendanceRecord, Subject } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedStandard, setSelectedStandard] = useState<string>('All');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [showPreview, setShowPreview] = useState(false);
  const [customSubjects, setCustomSubjects] = useState<Subject[]>([]);

  const allSubjects = useMemo(() => {
    const subjectsWithRecords = Array.from(new Set(attendance.map(r => r.subject)));
    const assignedSubjects = customSubjects
      .filter(s => (selectedStandard === 'All' || s.standard === selectedStandard) && (selectedDivision === 'All' || s.division === selectedDivision))
      .map(s => s.name);
    
    const combined = Array.from(new Set([...subjectsWithRecords, ...assignedSubjects])).filter(s => s && s.trim() !== '' && s !== 'All');
    return ['All', ...combined.sort()];
  }, [attendance, customSubjects, selectedStandard, selectedDivision]);

  const standards = useMemo(() => {
    const uniqueStandards = Array.from(new Set(students.map(s => s.standard))).filter(s => s && s.trim() !== '' && s !== 'All');
    return ['All', ...uniqueStandards.sort()];
  }, [students]);

  const divisions = useMemo(() => {
    const filtered = selectedStandard === 'All' ? students : students.filter(s => s.standard === selectedStandard);
    const uniqueDivisions = Array.from(new Set(filtered.map(s => s.division))).filter(s => s && s.trim() !== '' && s !== 'All');
    return ['All', ...uniqueDivisions.sort()];
  }, [students, selectedStandard]);

  useEffect(() => {
    const unsubscribeSubjects = subjectService.subscribeToSubjects((data) => {
      setCustomSubjects(data);
    });
    return unsubscribeSubjects;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let startDate: string;
        let endDate: string;

        if (reportType === 'daily') {
          startDate = date;
          endDate = date;
        } else if (reportType === 'monthly') {
          startDate = format(startOfMonth(new Date(month)), 'yyyy-MM-dd');
          endDate = format(endOfMonth(new Date(month)), 'yyyy-MM-dd');
        } else {
          const year = month.split('-')[0];
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
        }
        
        const [studentsData, attendanceData] = await Promise.all([
          new Promise<Student[]>((resolve) => studentService.subscribeToStudents(resolve)),
          attendanceService.getAttendanceForRangeAndDivision(
            startDate, 
            endDate, 
            selectedStandard === 'All' ? undefined : selectedStandard,
            selectedDivision === 'All' ? undefined : selectedDivision,
            selectedSubject === 'All' ? undefined : selectedSubject
          )
        ]);

        setStudents(studentsData);
        setAttendance(attendanceData || []);
      } catch (err) {
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [month, date, reportType, selectedStandard, selectedDivision, selectedSubject]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('preview') === 'true') {
      setShowPreview(true);
    }
  }, [location]);

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(211, 47, 47); // Red-600
    doc.text('Attendance Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, pageWidth / 2, 28, { align: 'center' });
    
    // Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Standard: ${selectedStandard}`, 14, 40);
    doc.text(`Division: ${selectedDivision}`, 14, 47);
    doc.text(`Subject: ${selectedSubject === 'All' ? 'All Subjects' : selectedSubject}`, 14, 54);
    
    let periodText = '';
    if (reportType === 'daily') periodText = format(new Date(date), 'dd MMM yyyy');
    else if (reportType === 'monthly') periodText = format(new Date(month), 'MMMM yyyy');
    else periodText = month.split('-')[0];
    
    doc.text(`Period: ${periodText}`, 14, 61);
    
    // Stats Summary
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 68, pageWidth - 28, 20, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.text(`Overall Attendance: ${stats.percentage.toFixed(1)}%`, 20, 80);
    doc.text(`Total Present: ${stats.present.toString()}`, 80, 80);
    doc.text(`Total Absent: ${stats.absent.toString()}`, 130, 80);

    // Group students by Standard and Division
    const filteredStudents = students.filter(s => (selectedStandard === 'All' || s.standard === selectedStandard) && (selectedDivision === 'All' || s.division === selectedDivision));
    
    const groupedStudents = filteredStudents.reduce((acc, student) => {
      const key = `Standard ${student.standard} - Division ${student.division}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    let currentY = 95;
    const tableSubjects = selectedSubject === 'All' ? allSubjects.filter(s => s !== 'All') : [selectedSubject];
    const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let head: string[][] = [];
    if (reportType === 'daily') {
      head = [['Date', 'Roll No', 'Student Name', 'Subject', 'Attendance', 'Overall %']];
    } else if (reportType === 'monthly') {
      head = [['Roll No', 'Student Name', ...tableSubjects, 'Overall %']];
    } else {
      head = [['Roll No', 'Student Name', ...monthsList, 'Yearly %']];
    }

    Object.entries(groupedStudents).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).forEach(([groupName, groupStudents], index) => {
      if (index > 0) {
        doc.addPage();
        currentY = 20;
      }

      // Section Heading
      doc.setFontSize(14);
      doc.setTextColor(211, 47, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(groupName, 14, currentY);
      currentY += 8;

      const body = groupStudents
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }))
        .flatMap(student => {
          let studentRecords = attendance.filter(r => r.studentId === student.id);
          if (selectedSubject !== 'All') {
            studentRecords = studentRecords.filter(r => r.subject === selectedSubject);
          }

          if (reportType === 'daily') {
            studentRecords.sort((a, b) => a.date.localeCompare(b.date));
            if (studentRecords.length === 0) return [];

            const p = studentRecords.filter(r => r.status === 'present').length;
            const t = studentRecords.length;
            const overallRate = t > 0 ? (p / t) * 100 : 0;
            
            return studentRecords.map(record => {
              const sStats = studentSubjectStats[student.id]?.[record.subject] || { present: 0, total: 0 };
              const attendanceText = `${record.status === 'present' ? 'Present' : 'Absent'} (${sStats.present}/${sStats.total})`;
              
              return [
                format(new Date(record.date), 'dd/MM/yyyy'),
                student.rollNumber,
                student.name,
                record.subject,
                attendanceText,
                `${overallRate.toFixed(1)}%`
              ];
            });
          } else if (reportType === 'monthly') {
            const p = studentRecords.filter(r => r.status === 'present').length;
            const t = studentRecords.length;
            const overallRate = t > 0 ? (p / t) * 100 : 0;
            
            const subjectCells = tableSubjects.map(subject => {
              const sStats = studentSubjectStats[student.id]?.[subject] || { present: 0, total: 0 };
              return t > 0 ? `${sStats.present}/${sStats.total}` : '-';
            });
            
            return [[
              student.rollNumber,
              student.name,
              ...subjectCells,
              `${overallRate.toFixed(1)}%`
            ]];
          } else {
            // Yearly
            const p = studentRecords.filter(r => r.status === 'present').length;
            const t = studentRecords.length;
            const yearlyRate = t > 0 ? (p / t) * 100 : 0;

            const monthCells = monthsList.map((_, i) => {
              const monthStr = (i + 1).toString().padStart(2, '0');
              const yearStr = month.split('-')[0];
              const mRecords = studentRecords.filter(r => r.date.startsWith(`${yearStr}-${monthStr}`));
              const mp = mRecords.filter(r => r.status === 'present').length;
              const mt = mRecords.length;
              return mt > 0 ? `${((mp / mt) * 100).toFixed(0)}%` : '-';
            });

            return [[
              student.rollNumber,
              student.name,
              ...monthCells,
              `${yearlyRate.toFixed(1)}%`
            ]];
          }
        });

      let columnStyles: any = {};
      if (reportType === 'daily') {
        columnStyles = {
          0: { cellWidth: 20 },
          1: { cellWidth: 15 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 30 },
          4: { cellWidth: 35 },
          5: { cellWidth: 20 },
        };
      } else if (reportType === 'monthly') {
        columnStyles = {
          0: { cellWidth: 15 },
          1: { cellWidth: 'auto' },
        };
      } else {
        columnStyles = {
          0: { cellWidth: 15 },
          1: { cellWidth: 'auto' },
        };
      }

      autoTable(doc, {
        startY: currentY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [211, 47, 47], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: columnStyles
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`Attendance_Report_${selectedStandard}_${selectedDivision}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const closePreview = () => {
    setShowPreview(false);
  };

  const stats = useMemo(() => {
    const present = attendance.filter(r => r.status === 'present').length;
    const absent = attendance.filter(r => r.status === 'absent').length;
    const total = present + absent;
    const percentage = total > 0 ? (present / total) * 100 : 0;

    const subjectStats: Record<string, { present: number, absent: number, total: number, percentage: number }> = {};
    allSubjects.filter(s => s !== 'All').forEach(s => {
      const subRecords = attendance.filter(r => r.subject === s);
      const p = subRecords.filter(r => r.status === 'present').length;
      const a = subRecords.filter(r => r.status === 'absent').length;
      const t = p + a;
      subjectStats[s] = {
        present: p,
        absent: a,
        total: t,
        percentage: t > 0 ? (p / t) * 100 : 0
      };
    });

    return { present, absent, total, percentage, subjectStats };
  }, [attendance, allSubjects]);

  const studentSubjectStats = useMemo(() => {
    const data: Record<string, Record<string, { present: number, total: number }>> = {};
    
    students.filter(s => (selectedStandard === 'All' || s.standard === selectedStandard) && (selectedDivision === 'All' || s.division === selectedDivision)).forEach(student => {
      data[student.id] = {};
      allSubjects.filter(s => s !== 'All').forEach(subject => {
        const studentSubRecords = attendance.filter(r => r.studentId === student.id && r.subject === subject);
        data[student.id][subject] = {
          present: studentSubRecords.filter(r => r.status === 'present').length,
          total: studentSubRecords.length
        };
      });
    });

    return data;
  }, [students, attendance, allSubjects, selectedStandard, selectedDivision]);

  const reportRecords = useMemo(() => {
    return attendance
      .map(record => {
        const student = students.find(s => s.id === record.studentId);
        return {
          date: record.date,
          rollNumber: student?.rollNumber || 'N/A',
          studentName: student?.name || 'Unknown',
          standard: record.standard,
          division: record.division,
          subject: record.subject,
          status: record.status,
          markedAt: record.createdAt
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.studentName.localeCompare(b.studentName));
  }, [attendance, students]);

  const chartData = useMemo(() => {
    if (reportType === 'daily') {
      return allSubjects.filter(s => s !== 'All').map(subject => {
        const subRecords = attendance.filter(r => r.subject === subject);
        return {
          name: subject,
          present: subRecords.filter(r => r.status === 'present').length,
          absent: subRecords.filter(r => r.status === 'absent').length,
        };
      }).filter(d => d.present > 0 || d.absent > 0);
    } else if (reportType === 'monthly') {
      const days = eachDayOfInterval({
        start: startOfMonth(new Date(month)),
        end: endOfMonth(new Date(month))
      });

      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayRecords = attendance.filter(r => r.date === dayStr);
        return {
          name: format(day, 'dd'),
          present: dayRecords.filter(r => r.status === 'present').length,
          absent: dayRecords.filter(r => r.status === 'absent').length,
        };
      }).filter(d => d.present > 0 || d.absent > 0);
    } else {
      // Yearly: Group by month
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      return months.map(m => {
        const monthStr = m.toString().padStart(2, '0');
        const monthRecords = attendance.filter(r => r.date.startsWith(`${month.split('-')[0]}-${monthStr}`));
        return {
          name: format(new Date(2000, m - 1), 'MMM'),
          present: monthRecords.filter(r => r.status === 'present').length,
          absent: monthRecords.filter(r => r.status === 'absent').length,
        };
      }).filter(d => d.present > 0 || d.absent > 0);
    }
  }, [attendance, month, reportType]);

  const pieData = [
    { name: 'Present', value: stats.present, color: '#10B981' },
    { name: 'Absent', value: stats.absent, color: '#EF4444' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Generating reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Attendance Reports</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                <Calendar className="w-4 h-4 text-red-600" />
                {reportType === 'daily' ? (
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent border-none p-0 font-bold text-gray-900 focus:ring-0 cursor-pointer w-32"
                  />
                ) : (
                  <input 
                    type={reportType === 'monthly' ? "month" : "number"} 
                    min={reportType === 'yearly' ? "2000" : undefined}
                    max={reportType === 'yearly' ? "2100" : undefined}
                    value={reportType === 'monthly' ? month : month.split('-')[0]}
                    onChange={(e) => {
                      if (reportType === 'monthly') {
                        setMonth(e.target.value);
                      } else {
                        setMonth(`${e.target.value}-01`);
                      }
                    }}
                    className="bg-transparent border-none p-0 font-bold text-gray-900 focus:ring-0 cursor-pointer w-32"
                  />
                )}
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setReportType('daily')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    reportType === 'daily' 
                      ? 'bg-white text-red-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    reportType === 'monthly' 
                      ? 'bg-white text-red-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setReportType('yearly')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    reportType === 'yearly' 
                      ? 'bg-white text-red-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
              >
                <FileText className="w-5 h-5" />
                View Digital Report
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Picker
                label="Standard"
                value={selectedStandard}
                options={standards}
                prefix="Std "
                onChange={(std) => {
                  setSelectedStandard(std);
                  setSelectedDivision('All');
                }}
                icon={<GraduationCap className="w-5 h-5" />}
                placeholder="Select Standard"
              />
              <Picker
                label="Division"
                value={selectedDivision}
                options={divisions}
                prefix="Div "
                onChange={(div) => setSelectedDivision(div)}
                icon={<Users className="w-5 h-5" />}
                placeholder="Select Division"
              />
              <Picker
                label="Subject"
                value={selectedSubject}
                options={allSubjects}
                onChange={(sub) => setSelectedSubject(sub)}
                icon={<FileText className="w-5 h-5" />}
                placeholder="Select Subject"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Digital Report Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:p-0 print:bg-white print:block">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col print:max-h-none print:rounded-none print:shadow-none print:w-full"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Stored Digital Report</h2>
                  <p className="text-sm text-gray-500 font-medium">Auto-updated with every attendance mark</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
              
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
              >
                <Printer className="w-5 h-5" />
                Print Report
              </button>
              <button
                onClick={closePreview}
                className="p-2.5 bg-gray-100 text-gray-400 hover:text-gray-600 rounded-2xl transition-all hover:bg-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0" id="printable-report">
              <div className="max-w-4xl mx-auto space-y-8 print:space-y-6">
                {/* Report Header */}
                <div className="text-left space-y-2 pb-6">
                  <h1 className="text-3xl font-medium text-gray-900">Attendance Report</h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-lg text-gray-500">
                    <span>Std: {selectedStandard}</span>
                    <span>|</span>
                    <span>Div: {selectedDivision}</span>
                    <span>|</span>
                    <span>Subject: {selectedSubject === 'All' ? 'All Subjects' : selectedSubject}</span>
                    <span>|</span>
                    <span>Period: {reportType === 'monthly' ? format(new Date(month), 'yyyy-MM') : month.split('-')[0]}</span>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="md:hidden flex items-center gap-2 text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-wider">
                  <ArrowRight className="w-3 h-3 animate-pulse" />
                  Scroll right to see all columns
                </div>
                <div className="border border-gray-200 rounded-sm overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#D32F2F] border-b border-gray-200">
                        {reportType === 'daily' && <th className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 whitespace-nowrap bg-[#D32F2F]">Date</th>}
                        <th className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 whitespace-nowrap bg-[#D32F2F]">Roll No</th>
                        <th className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 whitespace-nowrap bg-[#D32F2F]">Student Name</th>
                        
                        {reportType === 'daily' && (
                          <>
                            <th className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 text-center whitespace-nowrap bg-[#D32F2F]">Subject</th>
                            <th className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 text-center whitespace-nowrap bg-[#D32F2F]">Attendance (Present/Total)</th>
                          </>
                        )}
                        
                        {reportType === 'monthly' && (selectedSubject === 'All' ? allSubjects.filter(s => s !== 'All') : [selectedSubject]).map(sub => (
                          <th key={sub} className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 text-center whitespace-nowrap bg-[#D32F2F]">{sub}</th>
                        ))}

                        {reportType === 'yearly' && ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                          <th key={m} className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 text-center whitespace-nowrap bg-[#D32F2F]">{m}</th>
                        ))}

                        <th className="px-2 md:px-4 py-2 text-[10px] md:text-sm font-bold text-white border-r border-white/20 text-center whitespace-nowrap bg-[#D32F2F]">
                          {reportType === 'yearly' ? 'Yearly %' : 'Overall %'}
                        </th>
                      </tr>
                    </thead>
                   <tbody className="divide-y divide-gray-200">
  {Object.entries(
    students
      .filter(s =>
        (selectedStandard === 'All' || s.standard === selectedStandard) &&
        (selectedDivision === 'All' || s.division === selectedDivision)
      )
      .reduce((acc, student) => {
        const key = `Standard ${student.standard} - Division ${student.division}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
      }, {} as Record<string, Student[]>)
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, groupStudents]) => (
      <React.Fragment key={groupName}>
        {/* 🔴 GROUP HEADING */}
        <tr className="bg-gray-100">
          <td colSpan={100} className="px-4 py-2 font-bold text-red-600">
            {groupName}
          </td>
        </tr>

        {/* 🔴 STUDENTS */}
        {groupStudents
          .sort((a, b) =>
            a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
          )
          .flatMap((student) => {
            let studentRecords = attendance.filter(r => r.studentId === student.id);
            if (selectedSubject !== 'All') {
              studentRecords = studentRecords.filter(r => r.subject === selectedSubject);
            }

            if (reportType === 'daily') {
              studentRecords.sort((a, b) => a.date.localeCompare(b.date));
              if (studentRecords.length === 0) return [];

              const p = studentRecords.filter(r => r.status === 'present').length;
              const t = studentRecords.length;
              const overallRate = t > 0 ? (p / t) * 100 : 0;

              return studentRecords.map(record => {
                const sStats = studentSubjectStats[student.id]?.[record.subject] || { present: 0, total: 0 };
                
                return (
                  <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50">{format(new Date(record.date), 'dd/MM/yyyy')}</td>
                    <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50">{student.rollNumber}</td>
                    <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50 font-bold">{student.name}</td>
                    <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50">{record.subject}</td>
                    <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-center border-r border-gray-200 bg-white group-hover:bg-gray-50">
                      <div className="flex flex-col">
                        <span className={`font-bold ${record.status === 'present' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {record.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                        <span className="text-[8px] md:text-[10px] font-medium text-gray-500">
                          ({sStats.present}/{sStats.total})
                        </span>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-center font-bold bg-white group-hover:bg-gray-50">
                      <span className={overallRate >= 75 ? 'text-emerald-600' : 'text-red-600'}>
                        {overallRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              });
            } else if (reportType === 'monthly') {
              const p = studentRecords.filter(r => r.status === 'present').length;
              const t = studentRecords.length;
              const overallRate = t > 0 ? (p / t) * 100 : 0;
              const tableSubjects = selectedSubject === 'All' ? allSubjects.filter(s => s !== 'All') : [selectedSubject];

              return [
                <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50">{student.rollNumber}</td>
                  <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50 font-bold">{student.name}</td>
                  
                  {tableSubjects.map(sub => {
                    const sStats = studentSubjectStats[student.id]?.[sub] || { present: 0, total: 0 };
                    const rate = sStats.total > 0 ? (sStats.present / sStats.total) * 100 : 0;
                    return (
                      <td key={sub} className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-center border-r border-gray-200 bg-white group-hover:bg-gray-50">
                        {sStats.total > 0 ? (
                          <div className="flex flex-col">
                            <span className={`font-bold ${rate >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {rate.toFixed(0)}%
                            </span>
                            <span className="text-[8px] md:text-[10px] font-medium text-gray-500">
                              ({sStats.present}/{sStats.total})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-center font-bold bg-white group-hover:bg-gray-50">
                    <span className={overallRate >= 75 ? 'text-emerald-600' : 'text-red-600'}>
                      {overallRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ];
            } else {
              // Yearly
              const p = studentRecords.filter(r => r.status === 'present').length;
              const t = studentRecords.length;
              const yearlyRate = t > 0 ? (p / t) * 100 : 0;
              const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

              return [
                <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50">{student.rollNumber}</td>
                  <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap bg-white group-hover:bg-gray-50 font-bold">{student.name}</td>
                  
                  {monthsList.map((_, i) => {
                    const monthStr = (i + 1).toString().padStart(2, '0');
                    const yearStr = month.split('-')[0];
                    const mRecords = studentRecords.filter(r => r.date.startsWith(`${yearStr}-${monthStr}`));
                    const mp = mRecords.filter(r => r.status === 'present').length;
                    const mt = mRecords.length;
                    const rate = mt > 0 ? (mp / mt) * 100 : 0;

                    return (
                      <td key={i} className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-center border-r border-gray-200 bg-white group-hover:bg-gray-50">
                        {mt > 0 ? (
                          <span className={`font-bold ${rate >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {rate.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-2 md:px-4 py-2 text-[10px] md:text-sm text-center font-bold bg-white group-hover:bg-gray-50">
                    <span className={yearlyRate >= 75 ? 'text-emerald-600' : 'text-red-600'}>
                      {yearlyRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ];
            }
          })}
      </React.Fragment>
    ))}
                    </tbody>
                  </table>
                </div>

                {/* Subject Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4">
                  {Object.entries(stats.subjectStats).filter(([_, s]) => s.total > 0).map(([name, s]) => (
                    <div key={name} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 truncate">{name}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-900">{s.percentage.toFixed(0)}%</span>
                        <span className="text-[10px] text-gray-400 font-medium">({s.present}/{s.total})</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Report Footer */}
                <div className="pt-8 text-center print:hidden">
                  <p className="text-xs text-gray-400 font-medium italic">
                    Generated on {format(new Date(), 'PPP p')} • EduTracker Digital System
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Avg. Attendance</p>
          <p className="text-3xl font-bold text-gray-900">{stats.percentage.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Present</p>
          <p className="text-3xl font-bold text-gray-900">{stats.present}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Absent</p>
          <p className="text-3xl font-bold text-gray-900">{stats.absent}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Records</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily/Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            {reportType === 'monthly' ? 'Daily' : 'Monthly'} Attendance Trend
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="present" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Attendance Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm font-bold text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
