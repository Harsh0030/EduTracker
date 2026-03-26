import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Save, 
  Calendar,
  Filter,
  Users,
  ChevronDown
} from 'lucide-react';
import Picker from '../components/Picker';
import { studentService, attendanceService, subjectService } from '../services/dataService';
import { Student, AttendanceRecord, Subject } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MarkAttendance: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [search, setSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customSubjects, setCustomSubjects] = useState<Subject[]>([]);

  const defaultSubjects = [];
  
  const availableSubjects = useMemo(() => {
    if (!selectedStandard || !selectedDivision) return [];
    const customForDiv = customSubjects
      .filter(s => s.standard === selectedStandard && s.division === selectedDivision)
      .map(s => s.name);
    return Array.from(new Set([...defaultSubjects, ...customForDiv])).filter(s => typeof s === 'string' && s.trim() !== '' && s !== 'All');
  }, [customSubjects, selectedStandard, selectedDivision]);

  useEffect(() => {
    // Only clear selected subject if it's no longer available in the new context
    if (selectedSubject && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject('');
    }
  }, [selectedStandard, selectedDivision, availableSubjects]);

  useEffect(() => {
    const unsubscribeStudents = studentService.subscribeToStudents((data) => {
      setAllStudents(data);
      setLoading(false);
    });
    
    const unsubscribeSubjects = subjectService.subscribeToSubjects((data) => {
      setCustomSubjects(data);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeSubjects();
    };
  }, []);

  const standards = useMemo(() => {
    return Array.from(new Set(allStudents.map(s => s.standard))).filter(s => s && s.trim() !== '').sort();
  }, [allStudents]);

  const divisions = useMemo(() => {
    if (!selectedStandard) return [];
    return Array.from(new Set(allStudents.filter(s => s.standard === selectedStandard).map(s => s.division))).filter(s => s && s.trim() !== '').sort();
  }, [allStudents, selectedStandard]);

  useEffect(() => {
    if (!selectedStandard || !selectedDivision) {
      setStudents([]);
      setAttendance({});
      return;
    }

    const divStudents = allStudents.filter(s => s.standard === selectedStandard && s.division === selectedDivision);
    setStudents(divStudents);

    if (!selectedSubject) return;

    const unsubscribeAttendance = attendanceService.subscribeToAttendanceByDateAndDivision(date, selectedStandard, selectedDivision, selectedSubject, (records) => {
      const initialAttendance: Record<string, 'present' | 'absent'> = {};
      
      // Default all to present
      divStudents.forEach(s => {
        initialAttendance[s.id] = 'present';
      });

      // Override with existing records
      records.forEach(r => {
        initialAttendance[r.studentId] = r.status;
      });
      setAttendance(initialAttendance);
    });

    return () => {
      unsubscribeAttendance();
    };
  }, [date, selectedStandard, selectedDivision, selectedSubject, allStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.rollNumber.includes(search)
    ).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
  }, [students, search]);

  const stats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter(s => s === 'present').length;
    const absent = Object.values(attendance).filter(s => s === 'absent').length;
    const unmarked = total - (present + absent);
    return { total, present, absent, unmarked };
  }, [students, attendance]);

  const toggleStatus = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSave = async () => {
    if (Object.keys(attendance).length === 0) {
      toast.error('Please mark at least one student');
      return;
    }

    setSaving(true);
    try {
      const records = Object.entries(attendance)
        .filter(([_, status]) => status !== undefined)
        .map(([studentId, status]) => ({
          studentId,
          standard: selectedStandard,
          division: selectedDivision,
          subject: selectedSubject,
          date,
          status: status as 'present' | 'absent',
          markedBy: user?.uid || 'unknown'
        }));

      await attendanceService.markAttendance(records);
      toast.success('Attendance saved successfully!');
    } catch (err) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 relative min-h-[80vh]">
      {/* Heading and Calendar at Top */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mark Attendance</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-gray-500 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none p-0 font-bold text-red-600 focus:ring-0 cursor-pointer"
              />
            </p>
            {selectedStandard && selectedDivision && (
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                {selectedStandard} - {selectedDivision} {selectedSubject && `| ${selectedSubject}`}
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Present</p>
            <p className="text-lg font-bold text-emerald-600">{stats.present}</p>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Absent</p>
            <p className="text-lg font-bold text-red-600">{stats.absent}</p>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </header>

      {/* Selection Section - Modern Pickers */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Picker
            label="Standard"
            value={selectedStandard}
            options={standards}
            prefix="Std "
            onChange={(s) => {
              setSelectedStandard(s);
              setSelectedDivision('');
              setSelectedSubject('');
            }}
            icon={<Users className="w-5 h-5" />}
            placeholder="Select Standard"
          />

          <Picker
            label="Division"
            value={selectedDivision}
            options={divisions}
            prefix="Div "
            onChange={(d) => {
              setSelectedDivision(d);
              setSelectedSubject('');
            }}
            icon={<Users className="w-5 h-5" />}
            placeholder="Select Division"
            disabled={!selectedStandard}
          />

          <Picker
            label="Subject"
            value={selectedSubject}
            options={availableSubjects}
            onChange={(s) => setSelectedSubject(s)}
            icon={<Filter className="w-5 h-5" />}
            placeholder="Select Subject"
            disabled={!selectedDivision}
          />
        </div>
      </div>

      {selectedStandard && selectedDivision && selectedSubject ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col mt-6">
          <div className="p-4 border-b border-gray-100 shrink-0 bg-white">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 max-h-[60vh]">
            <AnimatePresence mode="popLayout">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, i) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-bold group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{student.name}</h3>
                        <p className="text-xs text-gray-500 font-medium">Roll: {student.rollNumber}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => toggleStatus(student.id)}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-xl font-black text-lg md:text-xl transition-all flex items-center justify-center shadow-sm border-2 ${
                        attendance[student.id] === 'present'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-100'
                          : 'bg-red-500 text-white border-red-600 shadow-md shadow-red-100'
                      }`}
                    >
                      {attendance[student.id] === 'present' ? 'P' : 'A'}
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                    <Users className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">No students found</h3>
                  <p className="text-gray-500 text-sm">No students match your search.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {filteredStudents.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-[0.95] transition-all disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                Save 
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center mt-6">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Selection Required</h3>
          <p className="text-gray-500">Please select Standard, Division, and Subject to start marking attendance.</p>
        </div>
      )}
    </div>
  );
};

export default MarkAttendance;
