import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  PlusCircle, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Clock,
  ChevronRight,
  Settings as SettingsIcon
} from 'lucide-react';
import { studentService, attendanceService } from '../services/dataService';
import { Student, AttendanceRecord } from '../types';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [studentsCount, setStudentsCount] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  useEffect(() => {
    const unsubscribeStudents = studentService.subscribeToStudents((students) => {
      setStudentsCount(students.length);
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    const unsubscribeAttendance = attendanceService.subscribeToAttendanceByDate(today, (records) => {
      setTodayAttendance(records);
      setLoading(false);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeAttendance();
    };
  }, []);

  const stats = useMemo(() => {
    // Get unique students who have at least one record today
    const markedStudentIds = new Set(todayAttendance.map(r => r.studentId));
    
    // A student is "Present" if they have at least one 'present' mark today
    const presentStudentIds = new Set(todayAttendance.filter(r => r.status === 'present').map(r => r.studentId));
    
    // A student is "Absent" if they are marked today but have ZERO 'present' marks
    const absentStudentIds = Array.from(markedStudentIds).filter(id => !presentStudentIds.has(id));
    
    const presentCount = presentStudentIds.size;
    const absentCount = absentStudentIds.length;

    return [
      { label: 'Total Students', value: studentsCount, icon: Users, color: 'bg-blue-500', shadow: 'shadow-blue-100' },
      { label: 'Present Today', value: presentCount, icon: CheckCircle2, color: 'bg-emerald-500', shadow: 'shadow-emerald-100' },
      { label: 'Absent Today', value: absentCount, icon: XCircle, color: 'bg-red-500', shadow: 'shadow-red-100' },
    ];
  }, [studentsCount, todayAttendance]);

  const actions = [
    { label: 'Mark Attendance', icon: ClipboardCheck, path: '/attendance', color: 'bg-red-600', desc: 'Take daily attendance' },
    { label: 'Manage Students', icon: Users, path: '/students', color: 'bg-gray-900', desc: 'Add or edit student records' },
    { label: 'Stored Report', icon: BarChart3, path: '/reports?preview=true', color: 'bg-blue-600', desc: 'Live updated PDF report' },
    { label: 'Settings', icon: SettingsIcon, path: '/settings', color: 'bg-emerald-600', desc: 'Profile & security' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome, {profile?.displayName || 'Teacher'}!</h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <Link 
          to="/attendance"
          className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Mark Attendance
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5"
          >
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center shadow-lg ${stat.shadow}`}>
              <stat.icon className="text-white w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actions.map((action, i) => (
            <Link key={action.label} to={action.path}>
              <motion.div
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group transition-all hover:shadow-xl hover:shadow-gray-100"
              >
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                  <action.icon className="text-white w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">{action.label}</h3>
                <p className="text-sm text-gray-500 mb-4">{action.desc}</p>
                <div className="flex items-center text-sm font-bold text-red-600">
                  Get Started <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Recent Activity
          </h2>
          <button 
            onClick={() => setShowRecentActivity(!showRecentActivity)}
            className="text-sm font-bold text-red-600 hover:underline"
          >
            {showRecentActivity ? 'Hide Activity' : 'View All'}
          </button>
        </div>
        
        {showRecentActivity && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {todayAttendance.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {todayAttendance.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        record.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {record.status === 'present' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Attendance Marked</p>
                        <p className="text-xs text-gray-500">Subject: {record.subject} | ID: {record.studentId.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                      <Clock className="w-3 h-3" />
                      {format(new Date(record.createdAt), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No activity recorded for today yet.</p>
                <Link to="/attendance" className="text-red-600 font-bold mt-2 inline-block">Mark Attendance Now</Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
