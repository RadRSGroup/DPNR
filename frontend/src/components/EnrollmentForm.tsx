'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Shield,
  Heart,
  Star,
  Clock
} from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  schedule: string;
  status: string;
  capacity: {
    maximum: number;
    current: number;
    available: number;
  };
}

interface EnrollmentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: 'HE' | 'EN';
  paymentPlan: 'FULL' | 'FIVE_INSTALLMENTS' | 'TWELVE_INSTALLMENTS';
  cohortId: string;
  questionnaire: {
    motivation: string;
    previousExperience: boolean;
    expectations: string;
    referralSource: string;
    specialNeeds: string;
    agreedToTerms: boolean;
    agreedToPrivacy: boolean;
    marketingConsent: boolean;
  };
}

interface EnrollmentFormProps {
  locale?: 'he' | 'en';
}

export default function EnrollmentForm({ locale = 'he' }: EnrollmentFormProps) {
  const searchParams = useSearchParams();
  const preselectedCohortId = searchParams?.get('cohort');

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRTL = locale === 'he';

  const [formData, setFormData] = useState<EnrollmentFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredLanguage: 'HE',
    paymentPlan: 'FULL',
    cohortId: preselectedCohortId || '',
    questionnaire: {
      motivation: '',
      previousExperience: false,
      expectations: '',
      referralSource: '',
      specialNeeds: '',
      agreedToTerms: false,
      agreedToPrivacy: false,
      marketingConsent: true,
    },
  });

  // Content in both languages
  const content = {
    he: {
      title: 'הרשמה לתכנית פיתוח אישי ומקצועי',
      subtitle: 'בואו נתחיל את המסע שלכם לפיתוח אישי ומקצועי',
      steps: {
        cohortSelection: 'בחירת קבוצה',
        personalInfo: 'פרטים אישיים',
        questionnaire: 'שאלון התאמה',
        paymentPlan: 'תכנית תשלום',
        confirmation: 'אישור והשלמה'
      },
      cohortSelection: {
        title: 'בחרו את הקבוצה המתאימה לכם',
        startDate: 'תאריך התחלה',
        location: 'מיקום',
        schedule: 'לוח זמנים',
        spotsLeft: 'מקומות נותרו',
        select: 'בחר קבוצה זו'
      },
      personalInfo: {
        title: 'פרטים אישיים',
        firstName: 'שם פרטי',
        lastName: 'שם משפחה',
        email: 'כתובת אימייל',
        phone: 'מספר טלפון',
        preferredLanguage: 'שפה מועדפת',
        hebrew: 'עברית',
        english: 'אנגלית',
        required: 'שדה חובה'
      },
      questionnaire: {
        title: 'שאלון התאמה',
        motivation: 'מה המוטיבציה שלכם להצטרף לתכנית?',
        motivationPlaceholder: 'שתפו איתנו את המטרות והציפיות שלכם...',
        previousExperience: 'האם יש לכם ניסיון קודם בתכניות פיתוח אישי?',
        expectations: 'מה הציפיות שלכם מהתכנית?',
        expectationsPlaceholder: 'איך אתם רוצים להרגיש בסיום התכנית?',
        referralSource: 'איך שמעתם עלינו?',
        referralOptions: {
          friends: 'חברים/משפחה',
          social: 'רשתות חברתיות',
          search: 'חיפוש באינטרנט',
          ad: 'פרסומת',
          other: 'אחר'
        },
        specialNeeds: 'האם יש לכם צרכים מיוחדים או הערות?',
        specialNeedsPlaceholder: 'נגישות, דיאטה, אלרגיות וכו...',
        yes: 'כן',
        no: 'לא'
      },
      paymentPlan: {
        title: 'בחרו תכנית תשלום',
        totalPrice: '₪6,400',
        fullPayment: 'תשלום מלא',
        fullPaymentDesc: 'תשלום חד פעמי של כל הסכום',
        fullPaymentPrice: '₪6,400',
        fiveInstallments: '5 תשלומים',
        fiveInstallmentsDesc: 'תשלום ראשון ₪1,500, 4 תשלומים של ₪1,225',
        fiveInstallmentsPrice: '₪6,400',
        twelveInstallments: '12 תשלומים',
        twelveInstallmentsDesc: 'תשלום ראשון ₪800, 11 תשלומים של ₪509',
        twelveInstallmentsPrice: '₪6,400',
        recommended: 'מומלץ',
        selectPlan: 'בחר תכנית זו'
      },
      agreements: {
        terms: 'אני מסכים/ה לתנאי השימוש',
        privacy: 'אני מסכים/ה למדיניות הפרטיות',
        marketing: 'אני מעוניין/ת לקבל עדכונים ומידע שיווקי',
        readTerms: 'קרא תנאי שימוש',
        readPrivacy: 'קרא מדיניות פרטיות'
      },
      buttons: {
        next: 'המשך',
        previous: 'חזור',
        submit: 'שלח הרשמה',
        submitting: 'שולח...'
      },
      confirmation: {
        title: 'סיכום ההרשמה',
        cohort: 'קבוצה',
        personalDetails: 'פרטים אישיים',
        paymentPlan: 'תכנית תשלום',
        nextSteps: 'השלבים הבאים',
        paymentInfo: 'לאחר שליחת ההרשמה תועברו לעמוד התשלום',
        confirmationEmail: 'תקבלו אישור במייל תוך 24 שעות',
        questionsContact: 'לשאלות ניתן ליצור קשר בטלפון או במייל'
      },
      errors: {
        required: 'שדה חובה',
        email: 'כתובת אימייל לא תקינה',
        phone: 'מספר טלפון לא תקין',
        minLength: 'נדרש לפחות {min} תווים',
        agreement: 'יש לאשר את התנאים'
      }
    },
    en: {
      title: 'Personal & Professional Development Program Enrollment',
      subtitle: 'Let\'s start your journey of personal and professional development',
      steps: {
        cohortSelection: 'Cohort Selection',
        personalInfo: 'Personal Info',
        questionnaire: 'Questionnaire',
        paymentPlan: 'Payment Plan',
        confirmation: 'Confirmation'
      },
      cohortSelection: {
        title: 'Choose Your Cohort',
        startDate: 'Start Date',
        location: 'Location',
        schedule: 'Schedule',
        spotsLeft: 'Spots Left',
        select: 'Select This Cohort'
      },
      personalInfo: {
        title: 'Personal Information',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email Address',
        phone: 'Phone Number',
        preferredLanguage: 'Preferred Language',
        hebrew: 'Hebrew',
        english: 'English',
        required: 'Required field'
      },
      questionnaire: {
        title: 'Questionnaire',
        motivation: 'What motivates you to join this program?',
        motivationPlaceholder: 'Share your goals and expectations...',
        previousExperience: 'Do you have previous experience with personal development programs?',
        expectations: 'What are your expectations from the program?',
        expectationsPlaceholder: 'How do you want to feel at the end of the program?',
        referralSource: 'How did you hear about us?',
        referralOptions: {
          friends: 'Friends/Family',
          social: 'Social Media',
          search: 'Internet Search',
          ad: 'Advertisement',
          other: 'Other'
        },
        specialNeeds: 'Do you have any special needs or comments?',
        specialNeedsPlaceholder: 'Accessibility, diet, allergies, etc...',
        yes: 'Yes',
        no: 'No'
      },
      paymentPlan: {
        title: 'Choose Payment Plan',
        totalPrice: '₪6,400',
        fullPayment: 'Full Payment',
        fullPaymentDesc: 'One-time payment of the full amount',
        fullPaymentPrice: '₪6,400',
        fiveInstallments: '5 Installments',
        fiveInstallmentsDesc: 'First payment ₪1,500, 4 payments of ₪1,225',
        fiveInstallmentsPrice: '₪6,400',
        twelveInstallments: '12 Installments',
        twelveInstallmentsDesc: 'First payment ₪800, 11 payments of ₪509',
        twelveInstallmentsPrice: '₪6,400',
        recommended: 'Recommended',
        selectPlan: 'Select This Plan'
      },
      agreements: {
        terms: 'I agree to the Terms of Service',
        privacy: 'I agree to the Privacy Policy',
        marketing: 'I would like to receive updates and marketing information',
        readTerms: 'Read Terms of Service',
        readPrivacy: 'Read Privacy Policy'
      },
      buttons: {
        next: 'Next',
        previous: 'Previous',
        submit: 'Submit Enrollment',
        submitting: 'Submitting...'
      },
      confirmation: {
        title: 'Enrollment Summary',
        cohort: 'Cohort',
        personalDetails: 'Personal Details',
        paymentPlan: 'Payment Plan',
        nextSteps: 'Next Steps',
        paymentInfo: 'After submitting enrollment you will be redirected to payment',
        confirmationEmail: 'You will receive confirmation email within 24 hours',
        questionsContact: 'For questions contact us by phone or email'
      },
      errors: {
        required: 'Required field',
        email: 'Invalid email address',
        phone: 'Invalid phone number',
        minLength: 'Minimum {min} characters required',
        agreement: 'Must agree to terms'
      }
    }
  };

  const t = content[locale];

  // Fetch cohorts
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would fetch from the API
        const mockCohorts = [
          {
            id: '1',
            name: 'קבוצת חורף 2024',
            startDate: '2024-12-01T00:00:00Z',
            endDate: '2025-03-01T00:00:00Z',
            location: 'מזכרת בתיה',
            schedule: 'ימי רביעי בערב, 19:00-21:30',
            status: 'OPEN_ENROLLMENT',
            capacity: { maximum: 20, current: 12, available: 8 }
          },
          {
            id: '2',
            name: 'קבוצת אביב 2025',
            startDate: '2025-03-15T00:00:00Z',
            endDate: '2025-06-15T00:00:00Z',
            location: 'מזכרת בתיה',
            schedule: 'ימי שני בערב, 19:00-21:30',
            status: 'UPCOMING',
            capacity: { maximum: 20, current: 0, available: 20 }
          }
        ];

        setCohorts(mockCohorts);

        // If cohort is preselected, find and set it
        if (preselectedCohortId) {
          const cohort = mockCohorts.find(c => c.id === preselectedCohortId);
          if (cohort) {
            setSelectedCohort(cohort);
            setFormData(prev => ({ ...prev, cohortId: cohort.id }));
            setCurrentStep(2); // Skip cohort selection
          }
        }
      } catch (error) {
        console.error('Failed to fetch cohorts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [preselectedCohortId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.cohortId) {
          newErrors.cohortId = t.errors.required;
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
        if (formData.questionnaire.motivation.length < 10) {
          newErrors.motivation = t.errors.minLength.replace('{min}', '10');
        }
        if (formData.questionnaire.expectations.length < 5) {
          newErrors.expectations = t.errors.minLength.replace('{min}', '5');
        }
        break;

      case 4:
        if (!formData.questionnaire.agreedToTerms) {
          newErrors.agreedToTerms = t.errors.agreement;
        }
        if (!formData.questionnaire.agreedToPrivacy) {
          newErrors.agreedToPrivacy = t.errors.agreement;
        }
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
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to payment page
        window.location.href = result.data.paymentUrl;
      } else {
        const error = await response.json();
        alert(error.message || 'שגיאה בשליחת ההרשמה');
      }
    } catch (error) {
      console.error('Enrollment submission error:', error);
      alert('שגיאה בשליחת ההרשמה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4, 5].map((step) => (
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
            {step < 5 && (
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

  const renderCohortSelection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.cohortSelection.title}
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {cohorts.map((cohort) => (
            <div
              key={cohort.id}
              className={`bg-white rounded-xl p-6 shadow-lg border-2 transition-colors cursor-pointer ${
                formData.cohortId === cohort.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setFormData(prev => ({ ...prev, cohortId: cohort.id }));
                setSelectedCohort(cohort);
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  {cohort.name}
                </h3>
                {formData.cohortId === cohort.id && (
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(cohort.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{cohort.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{cohort.schedule}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{cohort.capacity.available} {t.cohortSelection.spotsLeft}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {errors.cohortId && (
        <div className="text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errors.cohortId}
        </div>
      )}
    </div>
  );

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
      </div>
    </div>
  );

  const renderQuestionnaire = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.questionnaire.title}
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.questionnaire.motivation} *
          </label>
          <textarea
            value={formData.questionnaire.motivation}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, motivation: e.target.value }
            }))}
            placeholder={t.questionnaire.motivationPlaceholder}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.motivation ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.motivation && (
            <div className="text-red-600 text-xs mt-1">{errors.motivation}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.questionnaire.previousExperience}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="previousExperience"
                checked={formData.questionnaire.previousExperience === true}
                onChange={() => setFormData(prev => ({
                  ...prev,
                  questionnaire: { ...prev.questionnaire, previousExperience: true }
                }))}
                className="mr-2"
              />
              {t.questionnaire.yes}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="previousExperience"
                checked={formData.questionnaire.previousExperience === false}
                onChange={() => setFormData(prev => ({
                  ...prev,
                  questionnaire: { ...prev.questionnaire, previousExperience: false }
                }))}
                className="mr-2"
              />
              {t.questionnaire.no}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.questionnaire.expectations} *
          </label>
          <textarea
            value={formData.questionnaire.expectations}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, expectations: e.target.value }
            }))}
            placeholder={t.questionnaire.expectationsPlaceholder}
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.expectations ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.expectations && (
            <div className="text-red-600 text-xs mt-1">{errors.expectations}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.questionnaire.referralSource}
          </label>
          <select
            value={formData.questionnaire.referralSource}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, referralSource: e.target.value }
            }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">בחר...</option>
            <option value="friends">{t.questionnaire.referralOptions.friends}</option>
            <option value="social">{t.questionnaire.referralOptions.social}</option>
            <option value="search">{t.questionnaire.referralOptions.search}</option>
            <option value="ad">{t.questionnaire.referralOptions.ad}</option>
            <option value="other">{t.questionnaire.referralOptions.other}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.questionnaire.specialNeeds}
          </label>
          <textarea
            value={formData.questionnaire.specialNeeds}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, specialNeeds: e.target.value }
            }))}
            placeholder={t.questionnaire.specialNeedsPlaceholder}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderPaymentPlan = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.paymentPlan.title}
      </h2>

      <div className="space-y-4">
        {[
          {
            id: 'FULL',
            title: t.paymentPlan.fullPayment,
            description: t.paymentPlan.fullPaymentDesc,
            price: t.paymentPlan.fullPaymentPrice,
            recommended: false
          },
          {
            id: 'FIVE_INSTALLMENTS',
            title: t.paymentPlan.fiveInstallments,
            description: t.paymentPlan.fiveInstallmentsDesc,
            price: t.paymentPlan.fiveInstallmentsPrice,
            recommended: true
          },
          {
            id: 'TWELVE_INSTALLMENTS',
            title: t.paymentPlan.twelveInstallments,
            description: t.paymentPlan.twelveInstallmentsDesc,
            price: t.paymentPlan.twelveInstallmentsPrice,
            recommended: false
          }
        ].map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-xl p-6 border-2 cursor-pointer transition-colors ${
              formData.paymentPlan === plan.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, paymentPlan: plan.id as any }))}
          >
            {plan.recommended && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {t.paymentPlan.recommended}
                </span>
              </div>
            )}

            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {plan.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {plan.description}
                </p>
                <div className="text-2xl font-bold text-blue-600">
                  {plan.price}
                </div>
              </div>
              {formData.paymentPlan === plan.id && (
                <CheckCircle className="w-6 h-6 text-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          הסכמות ואישורים
        </h3>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.questionnaire.agreedToTerms}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, agreedToTerms: e.target.checked }
            }))}
            className="mt-1"
          />
          <div>
            <span className="text-gray-700">{t.agreements.terms} *</span>
            <Link href="/terms" className="text-blue-600 hover:underline mr-2">
              {t.agreements.readTerms}
            </Link>
          </div>
        </label>
        {errors.agreedToTerms && (
          <div className="text-red-600 text-xs">{errors.agreedToTerms}</div>
        )}

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.questionnaire.agreedToPrivacy}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, agreedToPrivacy: e.target.checked }
            }))}
            className="mt-1"
          />
          <div>
            <span className="text-gray-700">{t.agreements.privacy} *</span>
            <Link href="/privacy" className="text-blue-600 hover:underline mr-2">
              {t.agreements.readPrivacy}
            </Link>
          </div>
        </label>
        {errors.agreedToPrivacy && (
          <div className="text-red-600 text-xs">{errors.agreedToPrivacy}</div>
        )}

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.questionnaire.marketingConsent}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              questionnaire: { ...prev.questionnaire, marketingConsent: e.target.checked }
            }))}
            className="mt-1"
          />
          <span className="text-gray-700">{t.agreements.marketing}</span>
        </label>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.confirmation.title}
      </h2>

      <div className="bg-white rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t.confirmation.cohort}
          </h3>
          <p className="text-gray-600">{selectedCohort?.name}</p>
          <p className="text-gray-600">{selectedCohort && formatDate(selectedCohort.startDate)}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t.confirmation.personalDetails}
          </h3>
          <p className="text-gray-600">{formData.firstName} {formData.lastName}</p>
          <p className="text-gray-600">{formData.email}</p>
          <p className="text-gray-600">{formData.phone}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t.confirmation.paymentPlan}
          </h3>
          <p className="text-gray-600">
            {formData.paymentPlan === 'FULL' && t.paymentPlan.fullPayment}
            {formData.paymentPlan === 'FIVE_INSTALLMENTS' && t.paymentPlan.fiveInstallments}
            {formData.paymentPlan === 'TWELVE_INSTALLMENTS' && t.paymentPlan.twelveInstallments}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t.confirmation.nextSteps}
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {t.confirmation.paymentInfo}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {t.confirmation.confirmationEmail}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {t.confirmation.questionsContact}
          </li>
        </ul>
      </div>
    </div>
  );

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
          {currentStep === 1 && renderCohortSelection()}
          {currentStep === 2 && renderPersonalInfo()}
          {currentStep === 3 && renderQuestionnaire()}
          {currentStep === 4 && renderPaymentPlan()}
          {currentStep === 5 && renderConfirmation()}

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

            {currentStep < 5 ? (
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
                {isSubmitting ? t.buttons.submitting : t.buttons.submit}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}