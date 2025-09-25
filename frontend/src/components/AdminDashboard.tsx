'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  CreditCard,
  MessageCircle,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Settings,
  Download,
  Mail,
  Phone,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  Award,
  Target,
  BarChart3
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeEnrollments: number;
  pendingPayments: number;
  newConsultations: number;
  monthlyRevenue: number;
  completionRate: number;
  userGrowth: number;
  paymentSuccess: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_DELETION';
  role: 'USER' | 'ADMIN' | 'INSTRUCTOR';
  createdAt: string;
  lastLoginAt: string;
  enrollmentCount: number;
}

interface Enrollment {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  cohort: {
    name: string;
    startDate: string;
  };
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  paymentPlan: string;
  totalAmount: number;
  paidAmount: number;
  progress: number;
  createdAt: string;
}

interface AdminDashboardProps {
  locale?: 'he' | 'en';
}

export default function AdminDashboard({ locale = 'he' }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});

  const isRTL = locale === 'he';

  const content = {
    he: {
      title: 'ניהול המערכת',
      subtitle: 'לוח הבקרה למנהלי המערכת',
      tabs: {
        overview: 'סקירה',
        users: 'משתמשים',
        enrollments: 'הרשמות',
        cohorts: 'קבוצות',
        payments: 'תשלומים',
        consultations: 'ייעוצים',
        content: 'תוכן',
        settings: 'הגדרות'
      },
      stats: {
        totalUsers: 'סך המשתמשים',
        activeEnrollments: 'הרשמות פעילות',
        pendingPayments: 'תשלומים ממתינים',
        newConsultations: 'ייעוצים חדשים',
        monthlyRevenue: 'הכנסות חודשיות',
        completionRate: 'שיעור השלמה',
        userGrowth: 'גידול במשתמשים',
        paymentSuccess: 'הצלחת תשלומים'
      },
      users: {
        title: 'ניהול משתמשים',
        totalUsers: 'סך המשתמשים',
        newToday: 'חדשים היום',
        activeUsers: 'משתמשים פעילים',
        search: 'חיפוש משתמשים...',
        addUser: 'הוסף משתמש',
        export: 'ייצא נתונים',
        columns: {
          name: 'שם',
          email: 'אימייל',
          phone: 'טלפון',
          status: 'סטטוס',
          role: 'תפקיד',
          enrollments: 'הרשמות',
          lastLogin: 'כניסה אחרונה',
          actions: 'פעולות'
        },
        status: {
          ACTIVE: 'פעיל',
          INACTIVE: 'לא פעיל',
          PENDING_DELETION: 'ממתין למחיקה'
        },
        roles: {
          USER: 'משתמש',
          ADMIN: 'מנהל',
          INSTRUCTOR: 'מדריך'
        },
        actions: {
          view: 'צפה',
          edit: 'ערוך',
          delete: 'מחק',
          resetPassword: 'איפוס סיסמה',
          sendEmail: 'שלח אימייל'
        }
      },
      enrollments: {
        title: 'ניהול הרשמות',
        totalEnrollments: 'סך ההרשמות',
        activeEnrollments: 'הרשמות פעילות',
        pendingPayment: 'ממתינות לתשלום',
        search: 'חיפוש הרשמות...',
        export: 'ייצא נתונים',
        columns: {
          student: 'תלמיד',
          cohort: 'קבוצה',
          status: 'סטטוס',
          paymentPlan: 'תכנית תשלום',
          amount: 'סכום',
          paid: 'שולם',
          progress: 'התקדמות',
          enrolled: 'נרשם',
          actions: 'פעולות'
        },
        status: {
          PENDING_PAYMENT: 'ממתין לתשלום',
          ACTIVE: 'פעיל',
          COMPLETED: 'הושלם',
          CANCELLED: 'בוטל'
        },
        actions: {
          view: 'צפה',
          updateStatus: 'עדכן סטטוס',
          sendReminder: 'שלח תזכורת',
          refund: 'החזר כספי'
        }
      },
      quickActions: {
        title: 'פעולות מהירות',
        addUser: 'הוסף משתמש',
        createCohort: 'צור קבוצה',
        sendNewsletter: 'שלח ניוזלטר',
        generateReport: 'צור דוח',
        viewAnalytics: 'צפה באנליטיקס',
        manageContent: 'נהל תוכן'
      },
      recentActivity: {
        title: 'פעילות אחרונה',
        newEnrollment: 'הרשמה חדשה',
        paymentReceived: 'תשלום התקבל',
        userRegistered: 'משתמש נרשם',
        consultationBooked: 'ייעוץ נקבע',
        courseCompleted: 'קורס הושלם'
      },
      alerts: {
        title: 'התראות',
        pendingPayments: 'תשלומים ממתינים שדורשים טיפול',
        lowCapacity: 'קבוצות עם תפוסה נמוכה',
        systemMaintenance: 'תחזוקה מתוכננת במערכת',
        newConsultations: 'בקשות ייעוץ חדשות'
      }
    },
    en: {
      title: 'System Administration',
      subtitle: 'Admin Dashboard',
      tabs: {
        overview: 'Overview',
        users: 'Users',
        enrollments: 'Enrollments',
        cohorts: 'Cohorts',
        payments: 'Payments',
        consultations: 'Consultations',
        content: 'Content',
        settings: 'Settings'
      },
      stats: {
        totalUsers: 'Total Users',
        activeEnrollments: 'Active Enrollments',
        pendingPayments: 'Pending Payments',
        newConsultations: 'New Consultations',
        monthlyRevenue: 'Monthly Revenue',
        completionRate: 'Completion Rate',
        userGrowth: 'User Growth',
        paymentSuccess: 'Payment Success'
      },
      users: {
        title: 'User Management',
        totalUsers: 'Total Users',
        newToday: 'New Today',
        activeUsers: 'Active Users',
        search: 'Search users...',
        addUser: 'Add User',
        export: 'Export Data',
        columns: {
          name: 'Name',
          email: 'Email',
          phone: 'Phone',
          status: 'Status',
          role: 'Role',
          enrollments: 'Enrollments',
          lastLogin: 'Last Login',
          actions: 'Actions'
        },
        status: {
          ACTIVE: 'Active',
          INACTIVE: 'Inactive',
          PENDING_DELETION: 'Pending Deletion'
        },
        roles: {
          USER: 'User',
          ADMIN: 'Admin',
          INSTRUCTOR: 'Instructor'
        },
        actions: {
          view: 'View',
          edit: 'Edit',
          delete: 'Delete',
          resetPassword: 'Reset Password',
          sendEmail: 'Send Email'
        }
      },
      enrollments: {
        title: 'Enrollment Management',
        totalEnrollments: 'Total Enrollments',
        activeEnrollments: 'Active Enrollments',
        pendingPayment: 'Pending Payment',
        search: 'Search enrollments...',
        export: 'Export Data',
        columns: {
          student: 'Student',
          cohort: 'Cohort',
          status: 'Status',
          paymentPlan: 'Payment Plan',
          amount: 'Amount',
          paid: 'Paid',
          progress: 'Progress',
          enrolled: 'Enrolled',
          actions: 'Actions'
        },
        status: {
          PENDING_PAYMENT: 'Pending Payment',
          ACTIVE: 'Active',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled'
        },
        actions: {
          view: 'View',
          updateStatus: 'Update Status',
          sendReminder: 'Send Reminder',
          refund: 'Refund'
        }
      },
      quickActions: {
        title: 'Quick Actions',
        addUser: 'Add User',
        createCohort: 'Create Cohort',
        sendNewsletter: 'Send Newsletter',
        generateReport: 'Generate Report',
        viewAnalytics: 'View Analytics',
        manageContent: 'Manage Content'
      },
      recentActivity: {
        title: 'Recent Activity',
        newEnrollment: 'New Enrollment',
        paymentReceived: 'Payment Received',
        userRegistered: 'User Registered',
        consultationBooked: 'Consultation Booked',
        courseCompleted: 'Course Completed'
      },
      alerts: {
        title: 'Alerts',
        pendingPayments: 'Pending payments requiring attention',
        lowCapacity: 'Cohorts with low capacity',
        systemMaintenance: 'Scheduled system maintenance',
        newConsultations: 'New consultation requests'
      }
    }
  };

  const t = content[locale];

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      try {
        // Mock data for demo
        setStats({
          totalUsers: 1248,
          activeEnrollments: 89,
          pendingPayments: 12,
          newConsultations: 7,
          monthlyRevenue: 156800,
          completionRate: 89.5,
          userGrowth: 15.3,
          paymentSuccess: 98.2
        });

        setUsers([
          {
            id: '1',
            firstName: 'יוסי',
            lastName: 'כהן',
            email: 'yossi@example.com',
            phone: '050-1234567',
            status: 'ACTIVE',
            role: 'USER',
            createdAt: '2024-10-01T00:00:00Z',
            lastLoginAt: '2024-11-20T10:30:00Z',
            enrollmentCount: 2
          },
          {
            id: '2',
            firstName: 'שרה',
            lastName: 'לוי',
            email: 'sarah@example.com',
            phone: '050-9876543',
            status: 'ACTIVE',
            role: 'USER',
            createdAt: '2024-09-15T00:00:00Z',
            lastLoginAt: '2024-11-19T15:45:00Z',
            enrollmentCount: 1
          }
        ]);

        setEnrollments([
          {
            id: '1',
            user: { firstName: 'יוסי', lastName: 'כהן', email: 'yossi@example.com' },
            cohort: { name: 'קבוצת חורף 2024', startDate: '2024-12-01T00:00:00Z' },
            status: 'ACTIVE',
            paymentPlan: '5 תשלומים',
            totalAmount: 6400,
            paidAmount: 1500,
            progress: 35,
            createdAt: '2024-10-15T00:00:00Z'
          }
        ]);

      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
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
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats && Object.entries({
          totalUsers: { value: stats.totalUsers, icon: Users, color: 'blue' },
          activeEnrollments: { value: stats.activeEnrollments, icon: BookOpen, color: 'green' },
          pendingPayments: { value: stats.pendingPayments, icon: Clock, color: 'yellow' },
          newConsultations: { value: stats.newConsultations, icon: MessageCircle, color: 'purple' }
        }).map(([key, config]) => (
          <div key={key} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t.stats[key as keyof typeof t.stats]}</p>
                <p className="text-2xl font-bold text-gray-800">{config.value.toLocaleString()}</p>
              </div>
              <div className={`w-12 h-12 bg-${config.color}-100 rounded-lg flex items-center justify-center`}>
                <config.icon className={`w-6 h-6 text-${config.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue and Growth */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.stats.monthlyRevenue}</p>
              <p className="text-2xl font-bold text-gray-800">{stats && formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.stats.completionRate}</p>
              <p className="text-2xl font-bold text-gray-800">{stats && stats.completionRate}%</p>
            </div>
            <Award className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.stats.userGrowth}</p>
              <p className="text-2xl font-bold text-gray-800">+{stats && stats.userGrowth}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.stats.paymentSuccess}</p>
              <p className="text-2xl font-bold text-gray-800">{stats && stats.paymentSuccess}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.quickActions.title}</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: t.quickActions.addUser, icon: Users, href: '/admin/users/new', color: 'blue' },
            { title: t.quickActions.createCohort, icon: BookOpen, href: '/admin/cohorts/new', color: 'green' },
            { title: t.quickActions.sendNewsletter, icon: Mail, href: '/admin/communications', color: 'purple' },
            { title: t.quickActions.generateReport, icon: FileText, href: '/admin/reports', color: 'orange' },
            { title: t.quickActions.viewAnalytics, icon: BarChart3, href: '/admin/analytics', color: 'indigo' },
            { title: t.quickActions.manageContent, icon: Settings, href: '/admin/content', color: 'gray' }
          ].map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <action.icon className={`w-5 h-5 text-${action.color}-600`} />
              <span className="font-medium">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.recentActivity.title}</h3>
          <div className="space-y-3">
            {[
              { type: 'enrollment', user: 'יוסי כהן', time: '5 דקות' },
              { type: 'payment', user: 'שרה לוי', time: '12 דקות' },
              { type: 'consultation', user: 'דוד מזרחי', time: '25 דקות' },
              { type: 'completion', user: 'רחל ברק', time: '1 שעה' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <p className="text-xs text-gray-600">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.alerts.title}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">{t.alerts.pendingPayments}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800">{t.alerts.newConsultations}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t.users.title}</h2>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            {t.users.export}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            {t.users.addUser}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t.users.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              פילטר
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.name}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.email}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.phone}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.status}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.role}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.enrollments}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.lastLogin}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.users.columns.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {t.users.status[user.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t.users.roles[user.role]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.enrollmentCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEnrollments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t.enrollments.title}</h2>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" />
          {t.enrollments.export}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t.enrollments.search}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              פילטר
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.student}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.cohort}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.status}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.amount}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.progress}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.enrolled}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.enrollments.columns.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {enrollment.user.firstName} {enrollment.user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {enrollment.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {enrollment.cohort.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      enrollment.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
                      enrollment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {t.enrollments.status[enrollment.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{formatCurrency(enrollment.totalAmount)}</div>
                    <div className="text-xs text-gray-500">
                      שולם: {formatCurrency(enrollment.paidAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{enrollment.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(enrollment.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני ניהול...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t.title}</h1>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-gray-200 rounded-lg p-1 mb-8">
          {Object.entries(t.tabs).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 min-w-0 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
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
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'enrollments' && renderEnrollments()}
          {activeTab === 'cohorts' && <div className="text-center py-8 text-gray-500">ניהול קבוצות - בפיתוח</div>}
          {activeTab === 'payments' && <div className="text-center py-8 text-gray-500">ניהול תשלומים - בפיתוח</div>}
          {activeTab === 'consultations' && <div className="text-center py-8 text-gray-500">ניהול ייעוצים - בפיתוח</div>}
          {activeTab === 'content' && <div className="text-center py-8 text-gray-500">ניהול תוכן - בפיתוח</div>}
          {activeTab === 'settings' && <div className="text-center py-8 text-gray-500">הגדרות מערכת - בפיתוח</div>}
        </div>
      </div>
    </div>
  );
}