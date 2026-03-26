import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  Loader2, 
  X, 
  CheckCircle2, 
  UserPlus,
  GraduationCap,
  ClipboardList
} from 'lucide-react';
import Picker from '../components/Picker';
import { studentService } from '../services/dataService';
import { Student } from '../types';
import toast from 'react-hot-toast';

const ManageStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string>('None');
  const [selectedDivision, setSelectedDivision] = useState<string>('None');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'student' | 'division', id: string, name: string, standard?: string } | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [standard, setStandard] = useState('');
  const [division, setDivision] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = studentService.subscribeToStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const standards = useMemo(() => {
    const uniqueStandards = Array.from(new Set(students.map(s => s.standard))).filter(s => s && s.trim() !== '' && s !== 'None').sort();
    return ['None', ...uniqueStandards];
  }, [students]);

  const divisions = useMemo(() => {
    const filtered = selectedStandard === 'None' ? students : students.filter(s => s.standard === selectedStandard);
    const uniqueDivisions = Array.from(new Set(filtered.map(s => s.division))).filter(s => s && s.trim() !== '' && s !== 'None').sort();
    return ['None', ...uniqueDivisions];
  }, [students, selectedStandard]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.rollNumber.includes(search);
    const matchesStandard = selectedStandard === 'None' || s.standard === selectedStandard;
    const matchesDivision = selectedDivision === 'None' || s.division === selectedDivision;
    return matchesSearch && matchesStandard && matchesDivision;
  }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  const resetForm = () => {
    setName('');
    setRollNumber('');
    setStandard('');
    setDivision('');
    setEditingStudent(null);
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setName(student.name);
      setRollNumber(student.rollNumber);
      setStandard(student.standard);
      setDivision(student.division);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, {
          name,
          rollNumber,
          standard,
          division
        });
        toast.success('Student updated successfully!');
      } else {
        await studentService.addStudent({
          name,
          rollNumber,
          standard,
          division
        });
        toast.success('Student added successfully!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete({ type: 'student', id, name });
  };

  const handleDeleteDivision = async (std: string, div: string) => {
    setConfirmDelete({ type: 'division', id: div, name: `${std} - ${div}`, standard: std });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    
    setSubmitting(true);
    try {
      if (confirmDelete.type === 'student') {
        await studentService.deleteStudent(confirmDelete.id);
        toast.success('Student deleted successfully!');
      } else {
        if (confirmDelete.standard) {
          await studentService.deleteDivision(confirmDelete.standard, confirmDelete.id);
          toast.success(`Division ${confirmDelete.name} deleted successfully!`);
          if (selectedDivision === confirmDelete.id && selectedStandard === confirmDelete.standard) {
            setSelectedDivision('None');
          }
        }
      }
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete ${confirmDelete.type}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Manage Students</h1>
          <p className="text-gray-500 font-medium mt-1">Add, edit or remove student records from the system.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedStandard !== 'None' && selectedDivision !== 'None' && (
            <button
              onClick={() => handleDeleteDivision(selectedStandard, selectedDivision)}
              className="bg-white text-red-600 border border-red-100 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete {selectedStandard} - {selectedDivision}
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add Student
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none shadow-sm"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Picker
            label="Standard"
            value={selectedStandard}
            options={standards}
            prefix="Std "
            onChange={(s) => {
              setSelectedStandard(s);
              setSelectedDivision('None');
            }}
            icon={<GraduationCap className="w-5 h-5" />}
            placeholder="Select Standard"
          />
          <Picker
            label="Division"
            value={selectedDivision}
            options={divisions}
            prefix="Div "
            onChange={(d) => setSelectedDivision(d)}
            icon={<Users className="w-5 h-5" />}
            placeholder="Select Division"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading students...</p>
        </div>
      ) : selectedStandard === 'None' || selectedDivision === 'None' ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <GraduationCap className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Select Class</h3>
          <p className="text-gray-500">Please select a standard and division to view students.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-base font-bold text-gray-700 w-32 border-r border-gray-200">Roll No</th>
                  <th className="px-6 py-4 text-base font-bold text-gray-700">Student Name</th>
                  <th className="px-6 py-4 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <AnimatePresence mode="popLayout">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, i) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        <td className="px-6 py-4 text-gray-700 font-medium border-r border-gray-200">{student.rollNumber}</td>
                        <td className="px-6 py-4 text-gray-900 font-bold">{student.name}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenModal(student)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Edit Student"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(student.id, student.name)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                        <p className="text-gray-500 text-sm">Add your first student to get started.</p>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Roll Number</label>
                      <input
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 101"
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Standard</label>
                      <input
                        type="text"
                        required
                        value={standard}
                        onChange={(e) => setStandard(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Division</label>
                    <input
                      type="text"
                      required
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="e.g. A"
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {editingStudent ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Are you sure?</h2>
              <p className="text-gray-500 mb-8">
                {confirmDelete.type === 'student' 
                  ? `You are about to delete student "${confirmDelete.name}". This action cannot be undone.`
                  : `You are about to delete Division "${confirmDelete.name}". This will permanently remove all students and attendance records for this division.`}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  disabled={submitting}
                  className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageStudents;
