export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'teacher' | 'admin';
  createdAt: string;
  notificationSettings?: {
    enabled: boolean;
    reminderTime: string; // HH:mm format
    fcmToken?: string;
  };
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  standard: string;
  division: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  standard: string;
  division: string;
  subject: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  markedBy: string; // Teacher UID
  createdAt: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface SavedReport {
  id: string;
  title: string;
  period: string;
  type: 'monthly' | 'yearly';
  standard: string;
  division: string;
  subject: string;
  stats: AttendanceStats;
  records: {
    date: string;
    rollNumber: string;
    studentName: string;
    standard: string;
    division: string;
    subject: string;
    status: 'present' | 'absent';
    markedAt: string;
  }[];
  createdBy: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  standard: string;
  division: string;
  createdBy: string;
  createdAt: string;
}
