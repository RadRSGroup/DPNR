'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Video,
  MapPin,
  Globe,
  Languages,
  FileText,
  Send,
  CalendarDays,
  Timer,
  Users,
  Star,
  Heart
} from 'lucide-react';

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  meetingType: 'PHONE' | 'VIDEO' | 'IN_PERSON';
}

interface ConsultationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: 'HE' | 'EN';
  preferredTimeSlot: string;
  meetingType: 'PHONE' | 'VIDEO' | 'IN_PERSON';
  message: string;
  availableDates: string[];
  availableTimes: string[];
  referralSource: string;
  hasUrgency: boolean;
  urgencyReason: string;
}

interface ConsultationBookingProps {
  locale?: 'he' | 'en';
}

export default function ConsultationBooking({ locale = 'he' }: ConsultationBookingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const isRTL = locale === 'he';

  const [formData, setFormData] = useState<ConsultationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredLanguage: 'HE',
    preferredTimeSlot: '',
    meetingType: 'VIDEO',
    message: '',
    availableDates: [],
    availableTimes: [],
    referralSource: '',
    hasUrgency: false,
    urgencyReason: ''
  });

  // Content in both languages
  const content = {
    he: {
      title: 'קביעת פגישת ייעוץ',
      subtitle: 'קבעו פגישת ייעוץ חינם כדי להכיר את התכנית ולקבל מענה לכל השאלות שלכם',
      steps: {
        timeSlot: 'בחירת זמן',
        personalInfo: 'פרטים אישיים',
        preferences: 'העדפות',
        confirmation: 'אישור'
      },
      timeSlot: {
        title: 'בחרו זמן מתאים לפגישה',
        selectDate: 'בחירת תאריך',
        selectTime: 'בחירת שעה',
        meetingType: 'סוג הפגישה',
        phone: 'שיחת טלפון',
        video: 'שיחת וידאו',
        inPerson: 'פגישה פנים אל פנים',
        phoneDesc: 'שיחת טלפון נוחה ומהירה',
        videoDesc: 'שיחת וידאו דרך Zoom/Teams',
        inPersonDesc: 'פגישה במשרד במזכרת בתיה',
        duration: 'משך הפגישה: 30-45 דקות',
        noSlotsAvailable: 'אין זמנים זמינים לתאריך זה',
        selectDifferentDate: 'בחרו תאריך אחר',
        timeSlotRequired: 'יש לבחור זמן לפגישה'
      },
      personalInfo: {
        title: 'פרטים אישיים',
        firstName: 'שם פרטי',
        lastName: 'שם משפחה',
        email: 'כתובת אימייל',
        phone: 'מספר טלפון',
        preferredLanguage: 'שפה מועדפת לפגישה',
        hebrew: 'עברית',
        english: 'אנגלית',
        required: 'שדה חובה',
        message: 'הודעה (אופציונלי)',
        messagePlaceholder: 'ספרו לנו קצת על עצמכם ועל מה שמעניין אתכם בתכנית...',
        urgentConsultation: 'פגישה דחופה',
        urgentReason: 'סיבת הדחיפות',
        urgentReasonPlaceholder: 'למה הפגישה דחופה עבורכם?'
      },
      preferences: {
        title: 'העדפות נוספות',
        referralSource: 'איך שמעתם עלינו?',
        referralOptions: {
          friends: 'חברים/משפחה',
          social: 'רשתות חברתיות',
          search: 'חיפוש באינטרנט',
          ad: 'פרסומת',
          website: 'האתר שלנו',
          event: 'אירוע/הרצאה',
          other: 'אחר'
        },
        availableDates: 'תאריכים זמינים עבורכם',
        availableTimes: 'שעות זמינות עבורכם',
        timeOptions: {
          morning: 'בוקר (8:00-12:00)',
          afternoon: 'אחר הצהריים (12:00-17:00)',
          evening: 'ערב (17:00-21:00)',
          flexible: 'גמיש'
        },
        additionalNotes: 'הערות נוספות',
        notesPlaceholder: 'יש לכם שאלות ספציפיות? רוצים לדעת משהו מסוים?'
      },
      confirmation: {
        title: 'אישור פגישת הייעוץ',
        scheduledFor: 'הפגישה נקבעה ל:',
        meetingDetails: 'פרטי הפגישה',
        contactInfo: 'פרטי יצירת קשר',
        meetingType: 'סוג פגישה',
        language: 'שפת הפגישה',
        nextSteps: 'השלבים הבאים',
        confirmationEmail: 'תקבלו אישור במייל תוך כמה דקות',
        calendarInvite: 'יישלח אליכם זמן יומן',
        reminderCall: 'נתקשר יום לפני הפגישה לתזכורת',
        preparationTips: 'כדאי להכין רשימת שאלות מראש',
        contactSupport: 'לשאלות או שינויים, צרו קשר',
        reschedule: 'שינוי זמן פגישה',
        cancel: 'ביטול פגישה'
      },
      success: {
        title: 'הפגישה נקבעה בהצלחה!',
        message: 'תודה שבחרתם להכיר את התכנית שלנו',
        bookingNumber: 'מספר הזמנה',
        whatNext: 'מה הלאה?',
        emailConfirmation: 'אישור במייל',
        emailConfirmationDesc: 'תקבלו אישור מפורט במייל עם כל הפרטים',
        calendarEvent: 'אירוע ביומן',
        calendarEventDesc: 'תוכלו להוסיף את הפגישה ליומן שלכם',
        preparation: 'הכנה לפגישה',
        preparationDesc: 'נשלח לכם מדריך קצר להכנה לפגישה',
        backToHome: 'חזור לעמוד הבית',
        viewPrograms: 'צפה בתכניות'
      },
      buttons: {
        next: 'המשך',
        previous: 'חזור',
        bookConsultation: 'קבע פגישה',
        submitting: 'שולח...',
        reschedule: 'שנה זמן',
        cancel: 'בטל פגישה'
      },
      errors: {
        required: 'שדה חובה',
        email: 'כתובת אימייל לא תקינה',
        phone: 'מספר טלפון לא תקין',
        timeSlotRequired: 'יש לבחור זמן פגישה',
        submissionFailed: 'שליחת הבקשה נכשלה',
        networkError: 'שגיאת רשת - בדקו את החיבור'
      }
    },
    en: {
      title: 'Schedule a Consultation',
      subtitle: 'Book a free consultation to learn about our program and get answers to all your questions',
      steps: {
        timeSlot: 'Time Selection',
        personalInfo: 'Personal Info',
        preferences: 'Preferences',
        confirmation: 'Confirmation'
      },
      timeSlot: {
        title: 'Choose a suitable time for the meeting',
        selectDate: 'Select Date',
        selectTime: 'Select Time',
        meetingType: 'Meeting Type',
        phone: 'Phone Call',
        video: 'Video Call',
        inPerson: 'In-Person Meeting',
        phoneDesc: 'Convenient and quick phone call',
        videoDesc: 'Video call via Zoom/Teams',
        inPersonDesc: 'Face-to-face meeting in Mazkeret Batya office',
        duration: 'Meeting duration: 30-45 minutes',
        noSlotsAvailable: 'No available times for this date',
        selectDifferentDate: 'Select a different date',
        timeSlotRequired: 'Please select a meeting time'
      },
      personalInfo: {
        title: 'Personal Information',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email Address',
        phone: 'Phone Number',
        preferredLanguage: 'Preferred Meeting Language',
        hebrew: 'Hebrew',
        english: 'English',
        required: 'Required field',
        message: 'Message (Optional)',
        messagePlaceholder: 'Tell us about yourself and what interests you in the program...',
        urgentConsultation: 'Urgent Consultation',
        urgentReason: 'Urgency Reason',
        urgentReasonPlaceholder: 'Why is this consultation urgent for you?'
      },
      preferences: {
        title: 'Additional Preferences',
        referralSource: 'How did you hear about us?',
        referralOptions: {
          friends: 'Friends/Family',
          social: 'Social Media',
          search: 'Internet Search',
          ad: 'Advertisement',
          website: 'Our Website',
          event: 'Event/Lecture',
          other: 'Other'
        },
        availableDates: 'Your available dates',
        availableTimes: 'Your available times',
        timeOptions: {
          morning: 'Morning (8:00-12:00)',
          afternoon: 'Afternoon (12:00-17:00)',
          evening: 'Evening (17:00-21:00)',
          flexible: 'Flexible'
        },
        additionalNotes: 'Additional Notes',
        notesPlaceholder: 'Do you have specific questions? Want to know something particular?'
      },
      confirmation: {
        title: 'Consultation Confirmation',
        scheduledFor: 'Meeting scheduled for:',
        meetingDetails: 'Meeting Details',
        contactInfo: 'Contact Information',
        meetingType: 'Meeting Type',
        language: 'Meeting Language',
        nextSteps: 'Next Steps',
        confirmationEmail: 'You will receive confirmation email within minutes',
        calendarInvite: 'Calendar invite will be sent to you',
        reminderCall: 'We will call the day before as a reminder',
        preparationTips: 'We recommend preparing a list of questions in advance',
        contactSupport: 'For questions or changes, contact us',
        reschedule: 'Reschedule Meeting',
        cancel: 'Cancel Meeting'
      },
      success: {
        title: 'Meeting Successfully Scheduled!',
        message: 'Thank you for choosing to learn about our program',
        bookingNumber: 'Booking Number',
        whatNext: 'What\'s Next?',
        emailConfirmation: 'Email Confirmation',
        emailConfirmationDesc: 'You will receive detailed confirmation email with all details',
        calendarEvent: 'Calendar Event',
        calendarEventDesc: 'You can add the meeting to your calendar',
        preparation: 'Meeting Preparation',
        preparationDesc: 'We will send you a brief preparation guide',
        backToHome: 'Back to Home',
        viewPrograms: 'View Programs'
      },
      buttons: {
        next: 'Next',
        previous: 'Previous',
        bookConsultation: 'Book Consultation',
        submitting: 'Submitting...',
        reschedule: 'Reschedule',
        cancel: 'Cancel Meeting'
      },
      errors: {
        required: 'Required field',
        email: 'Invalid email address',
        phone: 'Invalid phone number',
        timeSlotRequired: 'Please select a meeting time',
        submissionFailed: 'Request submission failed',
        networkError: 'Network error - check your connection'
      }
    }
  };

  const t = content[locale];

  // Generate available time slots for next 14 days
  useEffect(() => {
    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      const today = new Date();

      for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        // Skip weekends
        if (date.getDay() === 5 || date.getDay() === 6) continue;

        // Generate time slots for each day
        const timeSlots = [
          '09:00', '10:00', '11:00', '12:00',
          '14:00', '15:00', '16:00', '17:00',
          '18:00', '19:00', '20:00'
        ];

        timeSlots.forEach(time => {
          // Randomly make some slots unavailable for demo
          const available = Math.random() > 0.3;

          slots.push({
            id: `${date.toISOString().split('T')[0]}-${time}`,
            date: date.toISOString().split('T')[0],
            time,
            available,
            meetingType: 'VIDEO'
          });
        });
      }

      setAvailableSlots(slots);
    };

    generateTimeSlots();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!selectedSlot) {
          newErrors.timeSlot = t.errors.timeSlotRequired;
        }
        break;

      case 2:
        if (!formData.firstName.trim()) newErrors.firstName = t.errors.required;
        if (!formData.lastName.trim()) newErrors.lastName = t.errors.required;
        if (!formData.email.trim()) {
          newErrors.email = t.errors.required;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = t.errors.email;
        }
        if (!formData.phone.trim()) {
          newErrors.phone = t.errors.required;
        } else if (!/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/.test(formData.phone)) {
          newErrors.phone = t.errors.phone;
        }
        break;

      case 3:
        // No required fields in preferences step
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !selectedSlot) return;

    setIsSubmitting(true);
    try {
      const consultationData = {
        ...formData,
        preferredTimeSlot: `${selectedSlot.date} ${selectedSlot.time}`,
        meetingType: selectedSlot.meetingType,
      };

      const response = await fetch('/api/v1/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consultationData),
      });

      if (response.ok) {
        const result = await response.json();
        setSubmissionResult({
          success: true,
          bookingNumber: result.data.id,
          scheduledTime: selectedSlot,
          message: result.message
        });
        setCurrentStep(4);
      } else {
        const error = await response.json();
        throw new Error(error.message || t.errors.submissionFailed);
      }
    } catch (error) {
      console.error('Consultation booking error:', error);
      setSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : t.errors.submissionFailed
      });
      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === currentStep
                  ? 'bg-blue-600 text-white'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step < currentStep ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step
              )}
            </div>
            {step < 4 && (
              <div
                className={`w-8 h-0.5 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTimeSlotSelection = () => {
    const uniqueDates = [...new Set(availableSlots.map(slot => slot.date))];
    const [selectedDate, setSelectedDate] = useState<string>('');

    const availableTimesForDate = selectedDate
      ? availableSlots.filter(slot => slot.date === selectedDate && slot.available)
      : [];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          {t.timeSlot.title}
        </h2>

        {/* Meeting Type Selection */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {t.timeSlot.meetingType}
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                type: 'VIDEO' as const,
                icon: Video,
                title: t.timeSlot.video,
                description: t.timeSlot.videoDesc
              },
              {
                type: 'PHONE' as const,
                icon: Phone,
                title: t.timeSlot.phone,
                description: t.timeSlot.phoneDesc
              },
              {
                type: 'IN_PERSON' as const,
                icon: MapPin,
                title: t.timeSlot.inPerson,
                description: t.timeSlot.inPersonDesc
              }
            ].map((option) => (
              <div
                key={option.type}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.meetingType === option.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, meetingType: option.type }))}
              >
                <div className="flex items-center gap-3 mb-2">
                  <option.icon className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">{option.title}</span>
                  {formData.meetingType === option.type && (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600 text-center">
            <Clock className="w-4 h-4 inline mr-1" />
            {t.timeSlot.duration}
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {t.timeSlot.selectDate}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {uniqueDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`p-3 border-2 rounded-lg text-sm transition-colors ${
                  selectedDate === date
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">
                  {new Date(date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                    weekday: 'short'
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t.timeSlot.selectTime}
            </h3>
            {availableTimesForDate.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {availableTimesForDate.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 border-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSlot?.id === slot.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {formatTime(slot.time)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{t.timeSlot.noSlotsAvailable}</p>
                <p className="text-sm">{t.timeSlot.selectDifferentDate}</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Slot Summary */}
        {selectedSlot && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-2">
              {t.confirmation.scheduledFor}
            </h4>
            <div className="text-blue-700">
              <p>{formatDate(selectedSlot.date)}</p>
              <p>{formatTime(selectedSlot.time)}</p>
              <p>{formData.meetingType === 'VIDEO' && t.timeSlot.video}</p>
              <p>{formData.meetingType === 'PHONE' && t.timeSlot.phone}</p>
              <p>{formData.meetingType === 'IN_PERSON' && t.timeSlot.inPerson}</p>
            </div>
          </div>
        )}

        {errors.timeSlot && (
          <div className="text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errors.timeSlot}
          </div>
        )}
      </div>
    );
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.personalInfo.title}
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.personalInfo.firstName} *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.firstName ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.firstName && (
            <div className="text-red-600 text-xs mt-1">{errors.firstName}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.personalInfo.lastName} *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.lastName ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.lastName && (
            <div className="text-red-600 text-xs mt-1">{errors.lastName}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.personalInfo.email} *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <div className="text-red-600 text-xs mt-1">{errors.email}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.personalInfo.phone} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="050-1234567"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.phone ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.phone && (
            <div className="text-red-600 text-xs mt-1">{errors.phone}</div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.personalInfo.preferredLanguage}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="preferredLanguage"
                value="HE"
                checked={formData.preferredLanguage === 'HE'}
                onChange={(e) => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value as 'HE' | 'EN' }))}
                className="mr-2"
              />
              {t.personalInfo.hebrew}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="preferredLanguage"
                value="EN"
                checked={formData.preferredLanguage === 'EN'}
                onChange={(e) => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value as 'HE' | 'EN' }))}
                className="mr-2"
              />
              {t.personalInfo.english}
            </label>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.personalInfo.message}
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder={t.personalInfo.messagePlaceholder}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.hasUrgency}
              onChange={(e) => setFormData(prev => ({ ...prev, hasUrgency: e.target.checked }))}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-700">{t.personalInfo.urgentConsultation}</span>
              <p className="text-sm text-gray-600">אם הפגישה דחופה עבורכם, נעשה מאמץ לקבוע אותה מוקדם יותר</p>
            </div>
          </label>

          {formData.hasUrgency && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.personalInfo.urgentReason}
              </label>
              <textarea
                value={formData.urgencyReason}
                onChange={(e) => setFormData(prev => ({ ...prev, urgencyReason: e.target.value }))}
                placeholder={t.personalInfo.urgentReasonPlaceholder}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.preferences.title}
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.preferences.referralSource}
          </label>
          <select
            value={formData.referralSource}
            onChange={(e) => setFormData(prev => ({ ...prev, referralSource: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">בחר...</option>
            <option value="friends">{t.preferences.referralOptions.friends}</option>
            <option value="social">{t.preferences.referralOptions.social}</option>
            <option value="search">{t.preferences.referralOptions.search}</option>
            <option value="ad">{t.preferences.referralOptions.ad}</option>
            <option value="website">{t.preferences.referralOptions.website}</option>
            <option value="event">{t.preferences.referralOptions.event}</option>
            <option value="other">{t.preferences.referralOptions.other}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t.preferences.availableTimes}
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(t.preferences.timeOptions).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.availableTimes.includes(key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        availableTimes: [...prev.availableTimes, key]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        availableTimes: prev.availableTimes.filter(t => t !== key)
                      }));
                    }
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.preferences.additionalNotes}
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder={t.preferences.notesPlaceholder}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => {
    if (submissionResult?.success) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              {t.success.title}
            </h2>
            <p className="text-gray-600">
              {t.success.message}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t.success.bookingNumber}:</span>
              <span className="font-mono text-sm">{submissionResult.bookingNumber}</span>
            </div>

            {selectedSlot && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t.confirmation.scheduledFor}</span>
                  <div className="text-right">
                    <div>{formatDate(selectedSlot.date)}</div>
                    <div className="text-sm text-gray-600">{formatTime(selectedSlot.time)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t.confirmation.meetingType}:</span>
                  <span>
                    {formData.meetingType === 'VIDEO' && t.timeSlot.video}
                    {formData.meetingType === 'PHONE' && t.timeSlot.phone}
                    {formData.meetingType === 'IN_PERSON' && t.timeSlot.inPerson}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              {t.success.whatNext}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-800">{t.success.emailConfirmation}</div>
                  <div className="text-sm text-blue-700">{t.success.emailConfirmationDesc}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-800">{t.success.calendarEvent}</div>
                  <div className="text-sm text-blue-700">{t.success.calendarEventDesc}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-800">{t.success.preparation}</div>
                  <div className="text-sm text-blue-700">{t.success.preparationDesc}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t.success.backToHome}
            </button>
            <button
              onClick={() => router.push('/courses')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.success.viewPrograms}
            </button>
          </div>
        </div>
      );
    }

    // Confirmation before submission
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          {t.confirmation.title}
        </h2>

        <div className="bg-white rounded-xl p-6 space-y-6">
          {selectedSlot && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t.confirmation.meetingDetails}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">תאריך ושעה:</span>
                  <span>{formatDate(selectedSlot.date)} בשעה {formatTime(selectedSlot.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.confirmation.meetingType}:</span>
                  <span>
                    {formData.meetingType === 'VIDEO' && t.timeSlot.video}
                    {formData.meetingType === 'PHONE' && t.timeSlot.phone}
                    {formData.meetingType === 'IN_PERSON' && t.timeSlot.inPerson}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.confirmation.language}:</span>
                  <span>
                    {formData.preferredLanguage === 'HE' ? t.personalInfo.hebrew : t.personalInfo.english}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t.confirmation.contactInfo}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">שם:</span>
                <span>{formData.firstName} {formData.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">אימייל:</span>
                <span>{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">טלפון:</span>
                <span>{formData.phone}</span>
              </div>
            </div>
          </div>

          {formData.message && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">הודעה:</h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{formData.message}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            {t.confirmation.nextSteps}
          </h3>
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t.confirmation.confirmationEmail}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t.confirmation.calendarInvite}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t.confirmation.reminderCall}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t.confirmation.preparationTips}
            </li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {t.title}
          </h1>
          <p className="text-xl text-gray-600">
            {t.subtitle}
          </p>
        </div>

        {renderStepIndicator()}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 1 && renderTimeSlotSelection()}
          {currentStep === 2 && renderPersonalInfo()}
          {currentStep === 3 && renderPreferences()}
          {currentStep === 4 && renderConfirmation()}

          {currentStep < 4 && !submissionResult?.success && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.buttons.previous}
                </button>
              )}

              <div className="flex-1" />

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.buttons.next}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.buttons.submitting : t.buttons.bookConsultation}
                  {!isSubmitting && <Send className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}