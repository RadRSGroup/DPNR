'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Globe,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Calendar,
  Clock,
  Archive,
  RotateCcw,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface ConsentRecord {
  id: string;
  consentType: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING_EMAILS' | 'MARKETING_SMS' | 'DATA_PROCESSING' | 'COOKIES' | 'ANALYTICS';
  granted: boolean;
  version: string;
  createdAt: string;
  ipAddress?: string;
}

interface DataExportRequest {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  format: 'JSON' | 'CSV' | 'XML';
  progress: number;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

interface UserData {
  profile: any;
  enrollments: any[];
  payments: any[];
  consultations: any[];
  consents: ConsentRecord[];
  activityLogs: any[];
}

interface PrivacyCenterProps {
  locale?: 'he' | 'en';
}

export default function PrivacyCenter({ locale = 'he' }: PrivacyCenterProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [dataExportRequests, setDataExportRequests] = useState<DataExportRequest[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);

  const isRTL = locale === 'he';

  // Content in both languages
  const content = {
    he: {
      title: 'מרכז הפרטיות',
      subtitle: 'נהלו את הפרטיות שלכם ואת זכויותיכם בנתונים',
      tabs: {
        overview: 'סקירה',
        consents: 'הסכמות',
        dataExport: 'ייצוא נתונים',
        dataProcessing: 'עיבוד נתונים',
        rights: 'זכויותיכם'
      },
      overview: {
        title: 'סקירת פרטיות',
        dataProcessingTitle: 'עיבוד הנתונים שלכם',
        dataProcessingDesc: 'אנחנו מעבדים את הנתונים שלכם למטרות חינוכיות ותפעוליות',
        consentsTitle: 'ההסכמות שלכם',
        consentsDesc: 'נהלו את ההסכמות שלכם לשימוש בנתונים',
        retentionTitle: 'שמירת נתונים',
        retentionDesc: 'הנתונים שלכם נשמרים בהתאם למדיניות השמירה שלנו',
        securityTitle: 'אבטחת נתונים',
        securityDesc: 'אנחנו משתמשים בהצפנה ובאמצעי אבטחה מתקדמים',
        quickActions: 'פעולות מהירות',
        exportData: 'ייצוא נתונים',
        manageConsents: 'ניהול הסכמות',
        deleteAccount: 'מחיקת חשבון',
        viewPolicy: 'צפה במדיניות פרטיות'
      },
      consents: {
        title: 'ניהול הסכמות',
        description: 'נהלו את ההסכמות שלכם לשימוש בנתונים האישיים',
        consentTypes: {
          TERMS_OF_SERVICE: 'תנאי שימוש',
          PRIVACY_POLICY: 'מדיניות פרטיות',
          MARKETING_EMAILS: 'אימיילי שיווק',
          MARKETING_SMS: 'הודעות SMS שיווקיות',
          DATA_PROCESSING: 'עיבוד נתונים',
          COOKIES: 'עוגיות',
          ANALYTICS: 'אנליטיקס'
        },
        status: {
          granted: 'מאושר',
          denied: 'נדחה'
        },
        grantedOn: 'אושר ב-',
        version: 'גרסה',
        ipAddress: 'כתובת IP',
        updateConsent: 'עדכן הסכמה',
        withdrawConsent: 'בטל הסכמה',
        grantConsent: 'אשר הסכמה',
        withdrawAll: 'בטל הכל',
        confirmWithdraw: 'האם אתם בטוחים שברצונכם לבטל את ההסכמה?',
        withdrawSuccess: 'ההסכמה בוטלה בהצלחה',
        updateSuccess: 'ההסכמה עודכנה בהצלחה'
      },
      dataExport: {
        title: 'ייצוא נתונים',
        description: 'הורידו עותק של כל הנתונים האישיים שלכם',
        requestExport: 'בקש ייצוא נתונים',
        format: 'פורמט',
        includeHistory: 'כלול היסטוריה',
        dataTypes: 'סוגי נתונים',
        profileData: 'נתוני פרופיל',
        enrollmentData: 'נתוני הרשמות',
        paymentData: 'נתוני תשלומים',
        consultationData: 'נתוני ייעוצים',
        consentData: 'נתוני הסכמות',
        activityData: 'נתוני פעילות',
        status: {
          PENDING: 'ממתין',
          PROCESSING: 'מעבד',
          COMPLETED: 'הושלם',
          FAILED: 'נכשל',
          EXPIRED: 'פג תוקף'
        },
        estimatedTime: 'זמן משוער: 24 שעות',
        downloadReady: 'הקובץ מוכן להורדה',
        downloadExpires: 'פג תוקף ב-',
        downloadFile: 'הורד קובץ',
        newRequest: 'בקשה חדשה',
        requestHistory: 'היסטוריית בקשות',
        noRequests: 'אין בקשות ייצוא',
        requestSuccess: 'בקשת הייצוא נשלחה בהצלחה'
      },
      dataProcessing: {
        title: 'פעילויות עיבוד נתונים',
        description: 'רשימת הפעילויות שאנחנו מבצעים עם הנתונים שלכם',
        purpose: 'מטרה',
        dataTypes: 'סוגי נתונים',
        legalBasis: 'בסיס חוקי',
        retention: 'תקופת שמירה',
        dataSource: 'מקור הנתונים',
        processing: 'עיבוד',
        storage: 'אחסון',
        sharing: 'שיתוף',
        automated: 'אוטומטי',
        manual: 'ידני'
      },
      rights: {
        title: 'הזכויות שלכם',
        description: 'זכויותיכם בנתונים האישיים על פי חוק הגנת הפרטיות',
        rightToAccess: 'זכות גישה',
        rightToAccessDesc: 'אתם זכאים לקבל מידע על הנתונים שאנחנו מחזיקים עליכם',
        rightToRectification: 'זכות תיקון',
        rightToRectificationDesc: 'אתם יכולים לבקש לתקן נתונים לא מדויקים',
        rightToErasure: 'זכות למחיקה',
        rightToErasureDesc: 'אתם יכולים לבקש למחוק את הנתונים שלכם',
        rightToPortability: 'זכות לניידות',
        rightToPortabilityDesc: 'אתם יכולים לבקש להעביר את הנתונים שלכם',
        rightToRestriction: 'זכות להגבלה',
        rightToRestrictionDesc: 'אתם יכולים לבקש להגביל את עיבוד הנתונים',
        rightToObject: 'זכות להתנגדות',
        rightToObjectDesc: 'אתם יכולים להתנגד לעיבוד הנתונים שלכם',
        exerciseRights: 'מימוש זכויות',
        contactUs: 'צרו איתנו קשר',
        complaintProcess: 'תהליך תלונה',
        complaintDesc: 'אם אתם לא מרוצים מהטיפול בבקשתכם, תוכלו להגיש תלונה לרשות הגנת הפרטיות'
      },
      accountDeletion: {
        title: 'מחיקת חשבון',
        warning: 'פעולה זו תמחק את כל הנתונים שלכם לצמיתות',
        description: 'מחיקת החשבון תכלול:',
        deletionItems: [
          'כל הנתונים האישיים',
          'היסטוריית הרשמות ותשלומים',
          'היסטוריית פעילות',
          'הודעות ותכתובות',
          'הגדרות והעדפות'
        ],
        retentionNotice: 'חלק מהנתונים עשויים להישמר לתקופה נוספת בהתאם לדרישות חוקיות',
        confirmationRequired: 'נדרש אישור',
        typeDeleteText: 'הקלידו "מחק את החשבון שלי" כדי לאשר',
        scheduleForDeletion: 'קבע למחיקה',
        cancellationPeriod: 'תקופת ביטול: 30 יום',
        immediateEffect: 'החשבון יהפוך לא פעיל מיד, אך המחיקה הסופית תבוצע לאחר 30 יום',
        scheduledDeletion: 'החשבון מתוכנן למחיקה ב-',
        cancelDeletion: 'בטל מחיקה',
        confirmCancel: 'האם אתם בטוחים שברצונכם לבטל את מחיקת החשבון?'
      },
      actions: {
        save: 'שמור',
        cancel: 'בטל',
        confirm: 'אשר',
        download: 'הורד',
        delete: 'מחק',
        update: 'עדכן',
        request: 'בקש',
        withdraw: 'בטל',
        grant: 'אשר'
      }
    },
    en: {
      title: 'Privacy Center',
      subtitle: 'Manage your privacy and data rights',
      tabs: {
        overview: 'Overview',
        consents: 'Consents',
        dataExport: 'Data Export',
        dataProcessing: 'Data Processing',
        rights: 'Your Rights'
      },
      overview: {
        title: 'Privacy Overview',
        dataProcessingTitle: 'Your Data Processing',
        dataProcessingDesc: 'We process your data for educational and operational purposes',
        consentsTitle: 'Your Consents',
        consentsDesc: 'Manage your consents for data usage',
        retentionTitle: 'Data Retention',
        retentionDesc: 'Your data is retained according to our retention policy',
        securityTitle: 'Data Security',
        securityDesc: 'We use encryption and advanced security measures',
        quickActions: 'Quick Actions',
        exportData: 'Export Data',
        manageConsents: 'Manage Consents',
        deleteAccount: 'Delete Account',
        viewPolicy: 'View Privacy Policy'
      },
      consents: {
        title: 'Consent Management',
        description: 'Manage your consents for personal data usage',
        consentTypes: {
          TERMS_OF_SERVICE: 'Terms of Service',
          PRIVACY_POLICY: 'Privacy Policy',
          MARKETING_EMAILS: 'Marketing Emails',
          MARKETING_SMS: 'Marketing SMS',
          DATA_PROCESSING: 'Data Processing',
          COOKIES: 'Cookies',
          ANALYTICS: 'Analytics'
        },
        status: {
          granted: 'Granted',
          denied: 'Denied'
        },
        grantedOn: 'Granted on',
        version: 'Version',
        ipAddress: 'IP Address',
        updateConsent: 'Update Consent',
        withdrawConsent: 'Withdraw Consent',
        grantConsent: 'Grant Consent',
        withdrawAll: 'Withdraw All',
        confirmWithdraw: 'Are you sure you want to withdraw this consent?',
        withdrawSuccess: 'Consent withdrawn successfully',
        updateSuccess: 'Consent updated successfully'
      },
      dataExport: {
        title: 'Data Export',
        description: 'Download a copy of all your personal data',
        requestExport: 'Request Data Export',
        format: 'Format',
        includeHistory: 'Include History',
        dataTypes: 'Data Types',
        profileData: 'Profile Data',
        enrollmentData: 'Enrollment Data',
        paymentData: 'Payment Data',
        consultationData: 'Consultation Data',
        consentData: 'Consent Data',
        activityData: 'Activity Data',
        status: {
          PENDING: 'Pending',
          PROCESSING: 'Processing',
          COMPLETED: 'Completed',
          FAILED: 'Failed',
          EXPIRED: 'Expired'
        },
        estimatedTime: 'Estimated time: 24 hours',
        downloadReady: 'File ready for download',
        downloadExpires: 'Expires on',
        downloadFile: 'Download File',
        newRequest: 'New Request',
        requestHistory: 'Request History',
        noRequests: 'No export requests',
        requestSuccess: 'Export request submitted successfully'
      },
      dataProcessing: {
        title: 'Data Processing Activities',
        description: 'List of activities we perform with your data',
        purpose: 'Purpose',
        dataTypes: 'Data Types',
        legalBasis: 'Legal Basis',
        retention: 'Retention Period',
        dataSource: 'Data Source',
        processing: 'Processing',
        storage: 'Storage',
        sharing: 'Sharing',
        automated: 'Automated',
        manual: 'Manual'
      },
      rights: {
        title: 'Your Rights',
        description: 'Your rights regarding personal data under privacy law',
        rightToAccess: 'Right to Access',
        rightToAccessDesc: 'You have the right to information about the data we hold about you',
        rightToRectification: 'Right to Rectification',
        rightToRectificationDesc: 'You can request to correct inaccurate data',
        rightToErasure: 'Right to Erasure',
        rightToErasureDesc: 'You can request to delete your data',
        rightToPortability: 'Right to Portability',
        rightToPortabilityDesc: 'You can request to transfer your data',
        rightToRestriction: 'Right to Restriction',
        rightToRestrictionDesc: 'You can request to restrict data processing',
        rightToObject: 'Right to Object',
        rightToObjectDesc: 'You can object to the processing of your data',
        exerciseRights: 'Exercise Rights',
        contactUs: 'Contact Us',
        complaintProcess: 'Complaint Process',
        complaintDesc: 'If you are not satisfied with our handling of your request, you can file a complaint with the Privacy Protection Authority'
      },
      accountDeletion: {
        title: 'Account Deletion',
        warning: 'This action will permanently delete all your data',
        description: 'Account deletion will include:',
        deletionItems: [
          'All personal data',
          'Enrollment and payment history',
          'Activity history',
          'Messages and correspondence',
          'Settings and preferences'
        ],
        retentionNotice: 'Some data may be retained for an additional period according to legal requirements',
        confirmationRequired: 'Confirmation Required',
        typeDeleteText: 'Type "DELETE MY ACCOUNT" to confirm',
        scheduleForDeletion: 'Schedule for Deletion',
        cancellationPeriod: 'Cancellation period: 30 days',
        immediateEffect: 'Account will become inactive immediately, but final deletion will occur after 30 days',
        scheduledDeletion: 'Account scheduled for deletion on',
        cancelDeletion: 'Cancel Deletion',
        confirmCancel: 'Are you sure you want to cancel account deletion?'
      },
      actions: {
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        download: 'Download',
        delete: 'Delete',
        update: 'Update',
        request: 'Request',
        withdraw: 'Withdraw',
        grant: 'Grant'
      }
    }
  };

  const t = content[locale];

  // Load privacy data
  useEffect(() => {
    const loadPrivacyData = async () => {
      setIsLoading(true);
      try {
        // Mock data for demo
        setConsents([
          {
            id: '1',
            consentType: 'TERMS_OF_SERVICE',
            granted: true,
            version: '1.0',
            createdAt: '2024-10-01T00:00:00Z',
            ipAddress: '192.168.1.1'
          },
          {
            id: '2',
            consentType: 'PRIVACY_POLICY',
            granted: true,
            version: '1.0',
            createdAt: '2024-10-01T00:00:00Z',
            ipAddress: '192.168.1.1'
          },
          {
            id: '3',
            consentType: 'MARKETING_EMAILS',
            granted: true,
            version: '1.0',
            createdAt: '2024-10-01T00:00:00Z',
            ipAddress: '192.168.1.1'
          },
          {
            id: '4',
            consentType: 'MARKETING_SMS',
            granted: false,
            version: '1.0',
            createdAt: '2024-10-01T00:00:00Z',
            ipAddress: '192.168.1.1'
          }
        ]);

        setDataExportRequests([
          {
            id: '1',
            status: 'COMPLETED',
            format: 'JSON',
            progress: 100,
            downloadUrl: 'https://example.com/export.json',
            expiresAt: '2024-12-01T00:00:00Z',
            createdAt: '2024-11-01T00:00:00Z'
          }
        ]);

      } catch (error) {
        console.error('Failed to load privacy data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrivacyData();
  }, []);

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

  const handleConsentUpdate = async (consentId: string, granted: boolean) => {
    try {
      const response = await fetch(`/api/v1/privacy/consent/${consentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ granted })
      });

      if (response.ok) {
        setConsents(prev => prev.map(c =>
          c.id === consentId ? { ...c, granted } : c
        ));
        alert(t.consents.updateSuccess);
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const handleDataExportRequest = async (format: 'JSON' | 'CSV' | 'XML', dataTypes: string[]) => {
    try {
      const response = await fetch('/api/v1/privacy/data-portability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          format,
          includeHistory: true,
          dataTypes
        })
      });

      if (response.ok) {
        const result = await response.json();
        setDataExportRequests(prev => [...prev, result.data]);
        alert(t.dataExport.requestSuccess);
      }
    } catch (error) {
      console.error('Failed to request data export:', error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800">{t.overview.dataProcessingTitle}</h3>
          </div>
          <p className="text-sm text-gray-600">{t.overview.dataProcessingDesc}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800">{t.overview.consentsTitle}</h3>
          </div>
          <p className="text-sm text-gray-600">{t.overview.consentsDesc}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800">{t.overview.retentionTitle}</h3>
          </div>
          <p className="text-sm text-gray-600">{t.overview.retentionDesc}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-800">{t.overview.securityTitle}</h3>
          </div>
          <p className="text-sm text-gray-600">{t.overview.securityDesc}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t.overview.quickActions}
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('dataExport')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5 text-blue-600" />
            <span>{t.overview.exportData}</span>
          </button>
          <button
            onClick={() => setActiveTab('consents')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-5 h-5 text-green-600" />
            <span>{t.overview.manageConsents}</span>
          </button>
          <Link
            href="/privacy-policy"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <span>{t.overview.viewPolicy}</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </Link>
          <button
            onClick={() => setShowConfirmDialog('deleteAccount')}
            className="flex items-center gap-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600"
          >
            <Trash2 className="w-5 h-5" />
            <span>{t.overview.deleteAccount}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderConsents = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {t.consents.title}
        </h3>
        <p className="text-gray-600 mb-6">
          {t.consents.description}
        </p>

        <div className="space-y-4">
          {consents.map((consent) => (
            <div key={consent.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">
                    {t.consents.consentTypes[consent.consentType]}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className={`flex items-center gap-1 ${
                      consent.granted ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {consent.granted ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {consent.granted ? t.consents.status.granted : t.consents.status.denied}
                    </span>
                    <span>{t.consents.grantedOn} {formatDate(consent.createdAt)}</span>
                    <span>{t.consents.version} {consent.version}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {consent.granted ? (
                    <button
                      onClick={() => handleConsentUpdate(consent.id, false)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      {t.consents.withdrawConsent}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConsentUpdate(consent.id, true)}
                      className="px-3 py-1 text-sm border border-green-300 text-green-600 rounded hover:bg-green-50 transition-colors"
                    >
                      {t.consents.grantConsent}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <button
            onClick={() => setShowConfirmDialog('withdrawAll')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {t.consents.withdrawAll}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDataExport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {t.dataExport.title}
        </h3>
        <p className="text-gray-600 mb-6">
          {t.dataExport.description}
        </p>

        <button
          onClick={() => setShowConfirmDialog('dataExport')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          {t.dataExport.requestExport}
        </button>
      </div>

      {dataExportRequests.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {t.dataExport.requestHistory}
          </h3>
          <div className="space-y-4">
            {dataExportRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">
                      {request.format} Export
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(request.createdAt)}
                    </div>
                    <div className={`text-sm font-medium mt-1 ${
                      request.status === 'COMPLETED' ? 'text-green-600' :
                      request.status === 'FAILED' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {t.dataExport.status[request.status]}
                    </div>
                  </div>
                  {request.status === 'COMPLETED' && request.downloadUrl && (
                    <div className="text-right">
                      <button
                        onClick={() => window.open(request.downloadUrl, '_blank')}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {t.dataExport.downloadFile}
                      </button>
                      {request.expiresAt && (
                        <div className="text-xs text-gray-600 mt-1">
                          {t.dataExport.downloadExpires} {formatDate(request.expiresAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDataProcessing = () => {
    const activities = [
      {
        purpose: 'ניהול חשבון משתמש',
        dataTypes: ['מידע אישי', 'פרטי קשר', 'העדפות'],
        legalBasis: 'ביצוע חוזה',
        retention: '30 יום לאחר מחיקת חשבון',
        dataSource: 'רישום משתמש'
      },
      {
        purpose: 'הרשמה והשתתפות בקורסים',
        dataTypes: ['רשומות הרשמה', 'מעקב התקדמות', 'תשובות שאלון'],
        legalBasis: 'ביצוע חוזה',
        retention: '7 שנים לרישומים פיננסיים, 3 שנים לרישומים חינוכיים',
        dataSource: 'תהליך הרשמה'
      },
      {
        purpose: 'עיבוד תשלומים ורישומים פיננסיים',
        dataTypes: ['מידע תשלום', 'היסטוריית עסקאות', 'פרטי חיוב'],
        legalBasis: 'ביצוע חוזה וחובה חוקית',
        retention: '7 שנים (דרישות מס וחשבונאות)',
        dataSource: 'עיבוד תשלומים'
      }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t.dataProcessing.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {t.dataProcessing.description}
          </p>

          <div className="space-y-6">
            {activities.map((activity, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">{activity.purpose}</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{t.dataProcessing.dataTypes}:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1">
                      {activity.dataTypes.map((type, i) => (
                        <li key={i}>{type}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t.dataProcessing.legalBasis}:</span>
                    <p className="text-gray-600 mt-1">{activity.legalBasis}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t.dataProcessing.retention}:</span>
                    <p className="text-gray-600 mt-1">{activity.retention}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t.dataProcessing.dataSource}:</span>
                    <p className="text-gray-600 mt-1">{activity.dataSource}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRights = () => {
    const rights = [
      {
        title: t.rights.rightToAccess,
        description: t.rights.rightToAccessDesc,
        icon: Eye
      },
      {
        title: t.rights.rightToRectification,
        description: t.rights.rightToRectificationDesc,
        icon: Settings
      },
      {
        title: t.rights.rightToErasure,
        description: t.rights.rightToErasureDesc,
        icon: Trash2
      },
      {
        title: t.rights.rightToPortability,
        description: t.rights.rightToPortabilityDesc,
        icon: Download
      },
      {
        title: t.rights.rightToRestriction,
        description: t.rights.rightToRestrictionDesc,
        icon: Lock
      },
      {
        title: t.rights.rightToObject,
        description: t.rights.rightToObjectDesc,
        icon: XCircle
      }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t.rights.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {t.rights.description}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {rights.map((right, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <right.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{right.title}</h4>
                    <p className="text-sm text-gray-600">{right.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">{t.rights.exerciseRights}</h4>
            <p className="text-blue-700 text-sm mb-3">
              {t.rights.contactUs}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t.rights.contactUs}
            </Link>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">{t.rights.complaintProcess}</h4>
            <p className="text-yellow-700 text-sm">
              {t.rights.complaintDesc}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmDialog = () => {
    if (!showConfirmDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          {showConfirmDialog === 'deleteAccount' && (
            <>
              <h3 className="text-lg font-semibold text-red-800 mb-4">
                {t.accountDeletion.title}
              </h3>
              <div className="text-red-600 text-sm mb-4">
                {t.accountDeletion.warning}
              </div>
              <p className="text-gray-700 mb-4">{t.accountDeletion.description}</p>
              <ul className="list-disc list-inside text-gray-600 text-sm mb-4">
                {t.accountDeletion.deletionItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="text-gray-600 text-sm mb-6">
                {t.accountDeletion.retentionNotice}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.actions.cancel}
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  {t.actions.confirm}
                </button>
              </div>
            </>
          )}

          {showConfirmDialog === 'withdrawAll' && (
            <>
              <h3 className="text-lg font-semibold text-orange-800 mb-4">
                {t.consents.withdrawAll}
              </h3>
              <p className="text-gray-700 mb-6">
                {t.consents.confirmWithdraw}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.actions.cancel}
                </button>
                <button className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                  {t.actions.confirm}
                </button>
              </div>
            </>
          )}

          {showConfirmDialog === 'dataExport' && (
            <>
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                {t.dataExport.requestExport}
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.dataExport.format}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="JSON">JSON</option>
                    <option value="CSV">CSV</option>
                    <option value="XML">XML</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {t.dataExport.estimatedTime}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.actions.cancel}
                </button>
                <button
                  onClick={() => {
                    handleDataExportRequest('JSON', ['PROFILE', 'ENROLLMENTS', 'PAYMENTS']);
                    setShowConfirmDialog(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.actions.request}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

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
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {t.title}
          </h1>
          <p className="text-xl text-gray-600">
            {t.subtitle}
          </p>
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
          {activeTab === 'consents' && renderConsents()}
          {activeTab === 'dataExport' && renderDataExport()}
          {activeTab === 'dataProcessing' && renderDataProcessing()}
          {activeTab === 'rights' && renderRights()}
        </div>

        {renderConfirmDialog()}
      </div>
    </div>
  );
}