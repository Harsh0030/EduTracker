import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Student, AttendanceRecord, SavedReport, Subject } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Student Service
export const studentService = {
  async addStudent(student: Omit<Student, 'id' | 'createdAt'>) {
    const id = doc(collection(db, 'students')).id;
    const newStudent: Student = {
      ...student,
      id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'students', id), newStudent);
      return newStudent;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `students/${id}`);
    }
  },

  async updateStudent(id: string, updates: Partial<Student>) {
    try {
      await updateDoc(doc(db, 'students', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    }
  },

  async deleteStudent(id: string) {
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    }
  },

  subscribeToStudents(callback: (students: Student[]) => void) {
    const q = query(collection(db, 'students'));
    return onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      callback(students);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });
  },

  subscribeToStudentsByStandardAndDivision(standard: string, division: string, callback: (students: Student[]) => void) {
    const q = query(
      collection(db, 'students'), 
      where('standard', '==', standard)
    );
    return onSnapshot(q, (snapshot) => {
      let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      students = students.filter(s => s.division === division);
      callback(students);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });
  },

  async deleteDivision(standard: string, division: string) {
    try {
      const q = query(
        collection(db, 'students'), 
        where('standard', '==', standard)
      );
      const snapshot = await getDocs(q);
      const batch = snapshot.docs
        .filter(doc => doc.data().division === division)
        .map(doc => deleteDoc(doc.ref));
      await Promise.all(batch);
      
      // Also delete attendance for this division
      await attendanceService.deleteAttendanceByDivision(standard, division);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${standard}/${division}`);
    }
  }
};

// Attendance Service
export const attendanceService = {
  async markAttendance(records: Omit<AttendanceRecord, 'id' | 'createdAt'>[]) {
    const batch = records.map(async (record) => {
      const id = `${record.studentId}_${record.date}_${record.subject.replace(/\s+/g, '_')}`;
      const newRecord: AttendanceRecord = {
        ...record,
        id,
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(doc(db, 'attendance', id), newRecord);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `attendance/${id}`);
      }
    });
    await Promise.all(batch);
  },

  subscribeToAttendanceByDate(date: string, callback: (records: AttendanceRecord[]) => void) {
    const q = query(
      collection(db, 'attendance'),
      where('date', '==', date)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance'));
  },

  subscribeToAttendanceByDateAndDivision(date: string, standard: string, division: string, subject: string, callback: (records: AttendanceRecord[]) => void) {
    let q = query(
      collection(db, 'attendance'), 
      where('date', '==', date)
    );

    return onSnapshot(q, (snapshot) => {
      let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      
      records = records.filter(r => r.standard === standard && r.division === division);
      
      if (subject && subject !== 'All') {
        records = records.filter(r => r.subject === subject);
      }
      
      callback(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });
  },

  async getAttendanceForRangeAndDivision(startDate: string, endDate: string, standard?: string, division?: string, subject?: string) {
    let q = query(
      collection(db, 'attendance'), 
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    try {
      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      
      if (standard && standard !== 'All') {
        records = records.filter(r => r.standard === standard);
      }
      if (division && division !== 'All') {
        records = records.filter(r => r.division === division);
      }
      if (subject && subject !== 'All') {
        records = records.filter(r => r.subject === subject);
      }
      
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    }
  },

  subscribeToAttendanceForRange(startDate: string, endDate: string, standard: string | undefined, division: string | undefined, subject: string | undefined, callback: (records: AttendanceRecord[]) => void) {
    let q = query(
      collection(db, 'attendance'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    return onSnapshot(q, (snapshot) => {
      let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      
      if (standard && standard !== 'All') {
        records = records.filter(r => r.standard === standard);
      }
      if (division && division !== 'All') {
        records = records.filter(r => r.division === division);
      }
      if (subject && subject !== 'All') {
        records = records.filter(r => r.subject === subject);
      }
      
      callback(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });
  },

  async deleteAttendanceByDivision(standard: string, division: string) {
    try {
      const q = query(
        collection(db, 'attendance'), 
        where('standard', '==', standard)
      );
      const snapshot = await getDocs(q);
      const batch = snapshot.docs
        .filter(doc => doc.data().division === division)
        .map(doc => deleteDoc(doc.ref));
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendance/${standard}/${division}`);
    }
  },

  async getAttendanceForStudent(studentId: string, startDate?: string, endDate?: string) {
    let q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId)
    );
    try {
      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      if (startDate) {
        records = records.filter(r => r.date >= startDate);
      }
      if (endDate) {
        records = records.filter(r => r.date <= endDate);
      }
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    }
  }
};

// Report Service
export const reportService = {
  async saveReport(report: Omit<SavedReport, 'id' | 'createdAt'>) {
    const id = doc(collection(db, 'savedReports')).id;
    const newReport: SavedReport = {
      ...report,
      id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'savedReports', id), newReport);
      return newReport;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `savedReports/${id}`);
    }
  },

  subscribeToSavedReports(callback: (reports: SavedReport[]) => void) {
    const q = query(collection(db, 'savedReports'));
    return onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedReport));
      callback(reports);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'savedReports');
    });
  },

  async deleteReport(id: string) {
    try {
      await deleteDoc(doc(db, 'savedReports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `savedReports/${id}`);
    }
  }
};

// Subject Service
export const subjectService = {
  async addSubject(name: string, standard: string, division: string, userId: string) {
    const id = doc(collection(db, 'subjects')).id;
    const newSubject: Subject = {
      id,
      name,
      standard,
      division,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'subjects', id), newSubject);
      return newSubject;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `subjects/${id}`);
    }
  },

  subscribeToSubjects(callback: (subjects: Subject[]) => void) {
    const q = query(collection(db, 'subjects'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      callback(subjects);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    });
  },

  subscribeToSubjectsByDivision(standard: string, division: string, callback: (subjects: Subject[]) => void) {
    const q = query(
      collection(db, 'subjects'), 
      where('standard', '==', standard),
      where('division', '==', division)
    );
    return onSnapshot(q, (snapshot) => {
      const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      subjects.sort((a, b) => a.name.localeCompare(b.name));
      callback(subjects);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    });
  },

  async deleteSubject(id: string) {
    try {
      await deleteDoc(doc(db, 'subjects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
    }
  }
};

// Reset Service
export const resetService = {
  async resetApp() {
    if (!auth.currentUser) throw new Error('Not authenticated');
    
    try {
      // Delete all students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentDeletes = studentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      // Delete all attendance
      const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
      const attendanceDeletes = attendanceSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
      
      // Delete subjects
      let subjectsQuery = collection(db, 'subjects');
      if (!isAdmin) {
        subjectsQuery = query(subjectsQuery, where('createdBy', '==', auth.currentUser.uid)) as any;
      }
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectDeletes = subjectsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      // Delete saved reports
      let reportsQuery = collection(db, 'savedReports');
      if (!isAdmin) {
        reportsQuery = query(reportsQuery, where('createdBy', '==', auth.currentUser.uid)) as any;
      }
      const reportsSnapshot = await getDocs(reportsQuery);
      const reportDeletes = reportsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all([
        ...studentDeletes,
        ...attendanceDeletes,
        ...subjectDeletes,
        ...reportDeletes
      ]);
      
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reset');
    }
  }
};

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
