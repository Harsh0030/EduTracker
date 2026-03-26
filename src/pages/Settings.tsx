import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  Save, 
  Shield, 
  Settings as SettingsIcon,
  Loader2,
  User as UserIcon,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subjectService, studentService, resetService } from '../services/dataService';
import { Subject, Student } from '../types';

const Settings: React.FC = () => {
  const { profile, updateProfile, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newSubjectStandard, setNewSubjectStandard] = useState('');
  const [newSubjectDivision, setNewSubjectDivision] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const unsubscribeSubjects = subjectService.subscribeToSubjects((data) => {
      setSubjects(data);
    });
    const unsubscribeStudents = studentService.subscribeToStudents((data) => {
      setStudents(data);
    });
    return () => {
      unsubscribeSubjects();
      unsubscribeStudents();
    };
  }, []);

  const standards = useMemo(() => {
    const uniqueStandards = Array.from(new Set(students.map(s => s.standard))).filter(s => s && s.trim() !== '');
    return uniqueStandards.sort();
  }, [students]);

  const divisions = useMemo(() => {
    if (!newSubjectStandard) return [];
    const filtered = students.filter(s => s.standard === newSubjectStandard);
    const uniqueDivisions = Array.from(new Set(filtered.map(s => s.division))).filter(s => s && s.trim() !== '');
    return uniqueDivisions.sort();
  }, [students, newSubjectStandard]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        displayName
      });
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newSubjectStandard || !newSubjectDivision || !user) {
      if (!newSubjectStandard) toast.error('Please select a standard for the subject');
      if (!newSubjectDivision) toast.error('Please select a division for the subject');
      return;
    }

    setAddingSubject(true);
    try {
      await subjectService.addSubject(newSubject.trim(), newSubjectStandard, newSubjectDivision, user.uid);
      setNewSubject('');
      toast.success('Subject added successfully!');
    } catch (err) {
      toast.error('Failed to add subject.');
    } finally {
      setAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await subjectService.deleteSubject(id);
      toast.success('Subject deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete subject.');
    }
  };

  const handleResetApp = async () => {
    setResetting(true);
    try {
      await resetService.resetApp();
      toast.success('App data has been reset successfully!');
      setShowResetModal(false);
    } catch (err) {
      console.error('Error resetting app:', err);
      toast.error('Failed to reset app data.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-red-600" />
          Settings
        </h1>
        <p className="text-gray-500 font-medium mt-1">Manage your account preferences</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Privacy & Security
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              We value your privacy. Your data is stored securely and only used for attendance tracking.
            </p>
          </div>
        </div>

        {/* Main Settings */}
        <div className="md:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8"
          >
            {/* Profile Settings */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-red-600" />
                  Profile Information
                </h3>
                <p className="text-sm text-gray-500">Update your display name</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Subject Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-red-600" />
                Manage Subjects
              </h3>
              <p className="text-sm text-gray-500">Add or remove subjects for attendance</p>
            </div>

            <form onSubmit={handleAddSubject} className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="New subject name..."
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                />
                <select
                  value={newSubjectStandard}
                  onChange={(e) => {
                    setNewSubjectStandard(e.target.value);
                    setNewSubjectDivision('');
                  }}
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Standard</option>
                  {standards.map(s => (
                    <option key={s} value={s}>Std {s}</option>
                  ))}
                </select>
                <select
                  value={newSubjectDivision}
                  onChange={(e) => setNewSubjectDivision(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Division</option>
                  {divisions.map(d => (
                    <option key={d} value={d}>Div {d}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={addingSubject || !newSubject.trim() || !newSubjectStandard || !newSubjectDivision}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingSubject ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Add
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((subject) => (
                <div 
                  key={subject.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-red-200 transition-all"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700">{subject.name}</span>
                    <span className="text-xs text-gray-400 font-medium">Std: {subject.standard} Div: {subject.division}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="col-span-full text-center py-8 text-gray-400 font-medium">No custom subjects added yet.</p>
              )}
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-gray-500">Irreversible actions for your account</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
              <div>
                <h4 className="font-bold text-gray-900">Reset App Data</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Delete all students, attendance records, subjects, and reports. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="whitespace-nowrap bg-white text-red-600 border border-red-200 px-6 py-2.5 rounded-xl font-bold hover:bg-red-50 hover:border-red-300 transition-all"
              >
                Reset Data
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-4 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Reset App Data?</h3>
            </div>
            
            <p className="text-gray-600 leading-relaxed">
              Are you absolutely sure you want to reset the app? This will permanently delete <strong>all</strong> students, attendance records, subjects, and reports. This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetApp}
                disabled={resetting}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Reset App'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Settings;
