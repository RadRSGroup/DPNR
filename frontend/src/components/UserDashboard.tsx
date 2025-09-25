'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Calendar,
  CreditCard,
  BookOpen,
  Download,
  MessageCircle,
  Settings,
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Phone,
  Mail,
  MapPin,
  Star,
  Award,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Bell,
  Shield,
  HelpCircle,
  Lock,
  ArrowRight
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: 'HE' | 'EN';
  profilePicture?: string;
  joinedAt: string;
  lastLoginAt: string;
}

interface Enrollment {
  id: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  paymentPlan: 'FULL' | 'FIVE_INSTALLMENTS' | 'TWELVE_INSTALLMENTS';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progress: number;
  nextInstallmentDate?: string;
  nextInstallmentAmount?: number;
  cohort: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    location: string;
    schedule: string;
  };
  completionCertificate?: string;
}

interface Payment {
  id: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  installmentNumber?: number;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  materials: string[];
  completed: boolean;
  completedAt?: string;
}

interface UserDashboardProps {
  locale?: 'he' | 'en';
}

export default function UserDashboard({ locale = 'he' }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);

  const isRTL = locale === 'he';

  // Content in both languages
  const content = {
    he: {
      title: 'הדשבורד שלי',
      welcome: 'שלום {name}!',
      lastLogin: 'כניסה אחרונה: {date}',
      tabs: {
        overview: 'סקירה',
        enrollments: 'הרשמות',
        payments: 'תשלומים',
        courses: 'קורסים',
        profile: 'פרופיל'
      },
      overview: {
        title: 'סקירה כללית',
        activeEnrollments: 'הרשמות פעילות',
        completedCourses: 'קורסים שהושלמו',
        totalPaid: 'סך הכל שולם',
        nextPayment: 'תשלום הבא',
        upcomingEvents: 'אירועים קרובים',
        recentActivity: 'פעילות אחרונה',
        quickActions: 'פעולות מהירות',
        viewCourse: 'צפה בקורס',
        makePayment: 'בצע תשלום',
        contactSupport: 'צור קשר לתמיכה',
        downloadCertificate: 'הורד תעודה'
      },
      enrollments: {
        title: 'ההרשמות שלי',
        status: {
          PENDING_PAYMENT: 'ממתין לתשלום',
          ACTIVE: 'פעיל',
          COMPLETED: 'הושלם',
          CANCELLED: 'בוטל'
        },
        cohort: 'קבוצה',
        startDate: 'תאריך התחלה',
        progress: 'התקדמות',
        paymentPlan: 'תכנית תשלום',
        totalAmount: 'סכום כולל',
        paidAmount: 'שולם',
        remainingAmount: 'יתרה',
        nextInstallment: 'תשלום הבא',
        viewDetails: 'צפה בפרטים',
        continuePayment: 'המשך תשלום',
        downloadCertificate: 'הורד תעודה'
      },
      payments: {
        title: 'היסטוריית תשלומים',
        date: 'תאריך',
        amount: 'סכום',
        method: 'אמצעי תשלום',
        status: 'סטטוס',
        transaction: 'מספר עסקה',
        installment: 'תשלום',
        downloadReceipt: 'הורד קבלה',
        paymentStatus: {
          SUCCESS: 'הצליח',
          FAILED: 'נכשל',
          PENDING: 'ממתין',
          REFUNDED: 'הוחזר'
        },
        upcomingPayments: 'תשלומים עתידיים',
        dueDate: 'תאריך יעד',
        payNow: 'שלם עכשיו'
      },
      courses: {
        title: 'הקורסים שלי',
        modules: 'מודולים',
        progress: 'התקדמות',
        completed: 'הושלם',
        inProgress: 'בתהליך',
        notStarted: 'לא התחיל',
        watchVideo: 'צפה בסרטון',
        downloadMaterials: 'הורד חומרים',
        markComplete: 'סמן כהושלם',
        moduleCompleted: 'מודול הושלם',
        completedAt: 'הושלם ב-{date}',
        duration: 'משך',
        materials: 'חומרי לימוד'
      },
      profile: {
        title: 'הפרופיל שלי',
        personalInfo: 'פרטים אישיים',
        firstName: 'שם פרטי',
        lastName: 'שם משפחה',
        email: 'אימייל',
        phone: 'טלפון',
        language: 'שפה מועדפת',
        hebrew: 'עברית',
        english: 'אנגלית',
        notifications: 'התראות',
        emailNotifications: 'התראות אימייל',
        smsNotifications: 'התראות SMS',
        privacy: 'פרטיות',
        dataExport: 'ייצוא נתונים',
        deleteAccount: 'מחק חשבון',
        saveChanges: 'שמור שינויים',
        showPersonalInfo: 'הצג פרטים אישיים',
        hidePersonalInfo: 'הסתר פרטים אישיים',
        joinedOn: 'הצטרף ב-{date}',
        accountSettings: 'הגדרות חשבון',
        changePassword: 'שנה סיסמה',
        twoFactorAuth: '2FA'
      },
      actions: {
        edit: 'ערוך',
        save: 'שמור',
        cancel: 'בטל',
        delete: 'מחק',
        download: 'הורד',
        view: 'צפה',
        contact: 'צור קשר',
        logout: 'התנתק'
      },
      paymentPlans: {
        FULL: 'תשלום מלא',
        FIVE_INSTALLMENTS: '5 תשלומים',
        TWELVE_INSTALLMENTS: '12 תשלומים'
      }
    },
    en: {
      title: 'My Dashboard',
      welcome: 'Hello {name}!',
      lastLogin: 'Last login: {date}',
      tabs: {
        overview: 'Overview',
        enrollments: 'Enrollments',
        payments: 'Payments',
        courses: 'Courses',
        profile: 'Profile'
      },
      overview: {
        title: 'Overview',
        activeEnrollments: 'Active Enrollments',
        completedCourses: 'Completed Courses',
        totalPaid: 'Total Paid',
        nextPayment: 'Next Payment',
        upcomingEvents: 'Upcoming Events',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',
        viewCourse: 'View Course',
        makePayment: 'Make Payment',
        contactSupport: 'Contact Support',
        downloadCertificate: 'Download Certificate'
      },
      enrollments: {
        title: 'My Enrollments',
        status: {
          PENDING_PAYMENT: 'Pending Payment',
          ACTIVE: 'Active',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled'
        },
        cohort: 'Cohort',
        startDate: 'Start Date',
        progress: 'Progress',
        paymentPlan: 'Payment Plan',
        totalAmount: 'Total Amount',
        paidAmount: 'Paid',
        remainingAmount: 'Remaining',
        nextInstallment: 'Next Payment',
        viewDetails: 'View Details',
        continuePayment: 'Continue Payment',
        downloadCertificate: 'Download Certificate'
      },
      payments: {
        title: 'Payment History',
        date: 'Date',
        amount: 'Amount',
        method: 'Payment Method',
        status: 'Status',
        transaction: 'Transaction ID',
        installment: 'Installment',
        downloadReceipt: 'Download Receipt',
        paymentStatus: {
          SUCCESS: 'Success',
          FAILED: 'Failed',
          PENDING: 'Pending',
          REFUNDED: 'Refunded'
        },
        upcomingPayments: 'Upcoming Payments',
        dueDate: 'Due Date',
        payNow: 'Pay Now'
      },
      courses: {
        title: 'My Courses',
        modules: 'Modules',
        progress: 'Progress',
        completed: 'Completed',
        inProgress: 'In Progress',
        notStarted: 'Not Started',
        watchVideo: 'Watch Video',
        downloadMaterials: 'Download Materials',
        markComplete: 'Mark Complete',
        moduleCompleted: 'Module Completed',
        completedAt: 'Completed on {date}',
        duration: 'Duration',
        materials: 'Learning Materials'
      },
      profile: {
        title: 'My Profile',
        personalInfo: 'Personal Information',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        language: 'Preferred Language',
        hebrew: 'Hebrew',
        english: 'English',
        notifications: 'Notifications',
        emailNotifications: 'Email Notifications',
        smsNotifications: 'SMS Notifications',
        privacy: 'Privacy',
        dataExport: 'Data Export',
        deleteAccount: 'Delete Account',
        saveChanges: 'Save Changes',
        showPersonalInfo: 'Show Personal Info',
        hidePersonalInfo: 'Hide Personal Info',
        joinedOn: 'Joined on {date}',
        accountSettings: 'Account Settings',
        changePassword: 'Change Password',
        twoFactorAuth: '2FA'
      },
      actions: {
        edit: 'Edit',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        download: 'Download',
        view: 'View',
        contact: 'Contact',
        logout: 'Logout'
      },
      paymentPlans: {
        FULL: 'Full Payment',
        FIVE_INSTALLMENTS: '5 Installments',
        TWELVE_INSTALLMENTS: '12 Installments'
      }
    }
  };

  const t = content[locale];

  // Mock data for demo
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Mock user data
        setUser({
          id: '1',
          firstName: 'יוסי',
          lastName: 'כהן',
          email: 'yossi@example.com',
          phone: '050-1234567',
          preferredLanguage: 'HE',
          joinedAt: '2024-01-15T00:00:00Z',
          lastLoginAt: new Date().toISOString()
        });

        // Mock enrollments
        setEnrollments([
          {
            id: '1',
            status: 'ACTIVE',
            paymentPlan: 'FIVE_INSTALLMENTS',
            totalAmount: 6400,
            paidAmount: 1500,
            remainingAmount: 4900,
            progress: 35,
            nextInstallmentDate: '2024-12-01T00:00:00Z',
            nextInstallmentAmount: 1225,
            cohort: {
              id: '1',
              name: 'קבוצת חורף 2024',
              startDate: '2024-11-01T00:00:00Z',
              endDate: '2025-02-01T00:00:00Z',
              location: 'מזכרת בתיה',
              schedule: 'ימי רביעי בערב, 19:00-21:30'
            }
          }
        ]);

        // Mock payments
        setPayments([
          {
            id: '1',
            amount: 1500,
            status: 'SUCCESS',
            paymentMethod: 'Visa ****1234',
            transactionId: 'TXN-123456789',
            createdAt: '2024-10-15T00:00:00Z',
            installmentNumber: 1
          }
        ]);

        // Mock course modules
        setCourseModules([
          {
            id: '1',
            title: 'הכרת העצמי והגדרת מטרות',
            description: 'למידת כלים לזיהוי חוזקות ואתגרים אישיים',
            videoUrl: 'https://example.com/video1',
            materials: ['מדריך PDF', 'תרגילים מעשיים'],
            completed: true,
            completedAt: '2024-11-05T00:00:00Z'
          },
          {
            id: '2',
            title: 'תכנון אסטרטגי אישי',
            description: 'בניית תכנית פעולה מותאמת אישית',
            videoUrl: 'https://example.com/video2',
            materials: ['תבניות תכנון', 'דוגמאות מעשיות'],
            completed: false
          },
          {
            id: '3',
            title: 'כלים לשינוי הרגלים',
            description: 'שיטות מוכחות ליצירת הרגלים חיוביים',
            videoUrl: 'https://example.com/video3',
            materials: ['מעקב הרגלים', 'טכניקות מוטיבציה'],
            completed: false
          }
        ]);

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'SUCCESS':
        return 'text-green-600 bg-green-100';
      case 'PENDING_PAYMENT':
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'COMPLETED':
        return 'text-blue-600 bg-blue-100';
      case 'CANCELLED':
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => {
    const activeEnrollment = enrollments.find(e => e.status === 'ACTIVE');
    const completedModules = courseModules.filter(m => m.completed).length;
    const totalPaid = payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0);

    return (
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-2">
            {user && t.welcome.replace('{name}', user.firstName)}
          </h2>
          <p className="text-blue-100">
            {user && t.lastLogin.replace('{date}', formatDate(user.lastLoginAt))}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t.overview.activeEnrollments}</p>
                <p className="text-2xl font-bold text-blue-600">{enrollments.filter(e => e.status === 'ACTIVE').length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t.overview.completedCourses}</p>
                <p className="text-2xl font-bold text-green-600">{completedModules}</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t.overview.totalPaid}</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPaid)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t.overview.nextPayment}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {activeEnrollment ? formatCurrency(activeEnrollment.nextInstallmentAmount || 0) : '₪0'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Active Enrollment */}
        {activeEnrollment && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t.enrollments.cohort}: {activeEnrollment.cohort.name}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.enrollments.progress}:</span>
                    <span className="font-semibold">{activeEnrollment.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${activeEnrollment.progress}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>{t.enrollments.paidAmount}:</span>
                    <span>{formatCurrency(activeEnrollment.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.enrollments.remainingAmount}:</span>
                    <span>{formatCurrency(activeEnrollment.remainingAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  href={`/courses/${activeEnrollment.cohort.id}`}
                  className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.overview.viewCourse}
                </Link>
                {activeEnrollment.nextInstallmentAmount && (
                  <Link
                    href={`/payment?enrollment=${activeEnrollment.id}`}
                    className="block w-full bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t.overview.makePayment}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {t.overview.quickActions}
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/courses"
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Play className="w-5 h-5 text-blue-600" />
              <span>{t.overview.viewCourse}</span>
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span>{t.overview.contactSupport}</span>
            </Link>
            <button className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-5 h-5 text-purple-600" />
              <span>{t.overview.downloadCertificate}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEnrollments = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{t.enrollments.title}</h2>

      {enrollments.map((enrollment) => (
        <div key={enrollment.id} className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {enrollment.cohort.name}
              </h3>
              <p className="text-gray-600">{enrollment.cohort.location}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(enrollment.status)}`}>
              {t.enrollments.status[enrollment.status]}
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">{t.enrollments.progress}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${enrollment.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{enrollment.progress}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-600">{t.enrollments.paymentPlan}</div>
              <div className="font-medium">{t.paymentPlans[enrollment.paymentPlan]}</div>
              <div className="text-xs text-gray-500">
                {formatCurrency(enrollment.paidAmount)} / {formatCurrency(enrollment.totalAmount)}
              </div>
            </div>

            <div className="space-y-2">
              {enrollment.nextInstallmentAmount && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800 font-medium">
                    {t.enrollments.nextInstallment}
                  </div>
                  <div className="text-lg font-bold text-yellow-800">
                    {formatCurrency(enrollment.nextInstallmentAmount)}
                  </div>
                  <div className="text-xs text-yellow-600">
                    {enrollment.nextInstallmentDate && formatDate(enrollment.nextInstallmentDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Link
              href={`/courses/${enrollment.cohort.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t.enrollments.viewDetails}
            </Link>
            {enrollment.nextInstallmentAmount && (
              <Link
                href={`/payment?enrollment=${enrollment.id}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t.enrollments.continuePayment}
              </Link>
            )}
            {enrollment.status === 'COMPLETED' && enrollment.completionCertificate && (
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                {t.enrollments.downloadCertificate}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{t.payments.title}</h2>

      {/* Upcoming Payments */}
      {enrollments.some(e => e.nextInstallmentAmount) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            {t.payments.upcomingPayments}
          </h3>
          {enrollments.filter(e => e.nextInstallmentAmount).map((enrollment) => (
            <div key={enrollment.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium text-yellow-800">
                  {enrollment.cohort.name}
                </div>
                <div className="text-sm text-yellow-600">
                  {t.payments.dueDate}: {enrollment.nextInstallmentDate && formatDate(enrollment.nextInstallmentDate)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-800">
                  {formatCurrency(enrollment.nextInstallmentAmount!)}
                </div>
                <Link
                  href={`/payment?enrollment=${enrollment.id}`}
                  className="text-sm text-yellow-600 hover:text-yellow-800 underline"
                >
                  {t.payments.payNow}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {t.payments.title}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.payments.date}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.payments.amount}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.payments.method}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.payments.status}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.payments.transaction}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.actions.download}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                      {t.payments.paymentStatus[payment.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {payment.transactionId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{t.courses.title}</h2>

      <div className="space-y-4">
        {courseModules.map((module) => (
          <div key={module.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {module.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {module.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {module.completed ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.courses.completed}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.courses.inProgress}</span>
                  </div>
                )}
              </div>
            </div>

            {module.completed && module.completedAt && (
              <div className="text-sm text-green-600 mb-4">
                {t.courses.completedAt.replace('{date}', formatDate(module.completedAt))}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {module.videoUrl && (
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Play className="w-4 h-4" />
                  {t.courses.watchVideo}
                </button>
              )}

              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                {t.courses.downloadMaterials} ({module.materials.length})
              </button>

              {!module.completed && (
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <CheckCircle className="w-4 h-4" />
                  {t.courses.markComplete}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{t.profile.title}</h2>

      {/* Personal Information */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            {t.profile.personalInfo}
          </h3>
          <button
            onClick={() => setShowPersonalInfo(!showPersonalInfo)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            {showPersonalInfo ? (
              <>
                <EyeOff className="w-4 h-4" />
                {t.profile.hidePersonalInfo}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                {t.profile.showPersonalInfo}
              </>
            )}
          </button>
        </div>

        {showPersonalInfo && user && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.profile.firstName}
              </label>
              <input
                type="text"
                value={user.firstName}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.profile.lastName}
              </label>
              <input
                type="text"
                value={user.lastName}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.profile.email}
              </label>
              <input
                type="email"
                value={user.email}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.profile.phone}
              </label>
              <input
                type="tel"
                value={user.phone}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          {user && t.profile.joinedOn.replace('{date}', formatDate(user.joinedAt))}
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">
          {t.profile.accountSettings}
        </h3>

        <div className="space-y-4">
          <Link
            href="/profile/change-password"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <span>{t.profile.changePassword}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href="/profile/privacy"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span>{t.profile.privacy}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href="/profile/data-export"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-600" />
              <span>{t.profile.dataExport}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-4">
          {t.profile.deleteAccount}
        </h3>
        <p className="text-red-700 text-sm mb-4">
          פעולה זו תמחק את החשבון שלכם לצמיתות ולא תהיה ניתנת לביטול
        </p>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          {t.profile.deleteAccount}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{t.title}</h1>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <LogOut className="w-5 h-5" />
            {t.actions.logout}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 rounded-lg p-1 mb-8">
          {Object.entries(t.tabs).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'enrollments' && renderEnrollments()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'courses' && renderCourses()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
}