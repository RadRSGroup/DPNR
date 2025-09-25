'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Lock,
  Calendar,
  User,
  Building,
  Receipt,
  Download,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Enrollment {
  id: string;
  status: string;
  paymentPlan: 'FULL' | 'FIVE_INSTALLMENTS' | 'TWELVE_INSTALLMENTS';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  nextInstallmentDate?: string;
  nextInstallmentAmount?: number;
  cohort: {
    id: string;
    name: string;
    startDate: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PaymentMethod {
  token?: string;
  cardLast4?: string;
  cardType?: string;
  expiryMonth?: string;
  expiryYear?: string;
  holderName?: string;
}

interface PaymentFlowProps {
  locale?: 'he' | 'en';
}

export default function PaymentFlow({ locale = 'he' }: PaymentFlowProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const enrollmentId = searchParams?.get('enrollment');
  const returnUrl = searchParams?.get('return');

  const [currentStep, setCurrentStep] = useState(1);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveCard, setSaveCard] = useState(false);
  const [useStoredCard, setUseStoredCard] = useState(false);
  const [storedCards, setStoredCards] = useState<PaymentMethod[]>([]);

  const isRTL = locale === 'he';

  // Content in both languages
  const content = {
    he: {
      title: 'תשלום עבור התכנית',
      subtitle: 'השלימו את התשלום כדי לאשר את ההרשמה שלכם',
      steps: {
        enrollment: 'פרטי הרשמה',
        payment: 'פרטי תשלום',
        confirmation: 'אישור'
      },
      enrollmentDetails: {
        title: 'פרטי ההרשמה',
        cohort: 'קבוצה',
        participant: 'משתתף',
        paymentPlan: 'תכנית תשלום',
        totalAmount: 'סכום כולל',
        paidAmount: 'שולם',
        remainingAmount: 'יתרה לתשלום',
        nextInstallment: 'תשלום הבא',
        dueDate: 'תאריך יעד'
      },
      paymentPlans: {
        FULL: 'תשלום מלא',
        FIVE_INSTALLMENTS: '5 תשלומים',
        TWELVE_INSTALLMENTS: '12 תשלומים'
      },
      paymentDetails: {
        title: 'פרטי תשלום',
        cardNumber: 'מספר כרטיס אשראי',
        cardHolder: 'שם בעל הכרטיס',
        expiryDate: 'תאריך תפוגה',
        cvv: 'CVV',
        amount: 'סכום לתשלום',
        saveCard: 'שמור כרטיס לתשלומים עתידיים',
        useStoredCard: 'השתמש בכרטיס שמור',
        newCard: 'כרטיס חדש',
        storedCards: 'כרטיסים שמורים',
        securePayment: 'תשלום מאובטח'
      },
      tranzila: {
        processingTitle: 'מעבד תשלום...',
        processingMessage: 'אנא המתינו בזמן עיבוד התשלום',
        redirecting: 'מפנה לעמוד התשלום המאובטח...',
        doNotClose: 'אל תסגרו את החלון',
        returnFromPayment: 'חוזרים מעיבוד תשלום...'
      },
      success: {
        title: 'התשלום בוצע בהצלחה!',
        message: 'ההרשמה שלכם אושרה והתשלום עובד',
        transactionId: 'מספר עסקה',
        receipt: 'קבלה',
        downloadReceipt: 'הורד קבלה',
        nextSteps: 'השלבים הבאים',
        confirmationEmail: 'תקבלו אישור במייל תוך כמה דקות',
        courseStart: 'הקורס יתחיל ב-{date}',
        dashboard: 'עבור לדשבורד',
        support: 'לתמיכה צרו קשר'
      },
      failure: {
        title: 'התשלום נכשל',
        message: 'מצטערים, התשלום לא הושלם בהצלחה',
        reason: 'סיבת הכשל',
        tryAgain: 'נסו שוב',
        contactSupport: 'צרו קשר לתמיכה',
        backToEnrollment: 'חזור להרשמה'
      },
      buttons: {
        continue: 'המשך',
        back: 'חזור',
        payNow: 'שלם עכשיו',
        tryAgain: 'נסה שוב',
        goToDashboard: 'עבור לדשבורד'
      },
      security: {
        sslSecured: 'מאובטח SSL',
        pciCompliant: 'תואם PCI',
        securePayment: 'תשלום מאובטח',
        tranzilaPowered: 'מופעל על ידי Tranzila'
      },
      errors: {
        required: 'שדה חובה',
        invalidCard: 'מספר כרטיס לא תקין',
        invalidExpiry: 'תאריך תפוגה לא תקין',
        invalidCvv: 'CVV לא תקין',
        cardExpired: 'כרטיס פג תוקף',
        paymentFailed: 'התשלום נכשל',
        networkError: 'שגיאת רשת - בדקו את החיבור'
      }
    },
    en: {
      title: 'Payment for Program',
      subtitle: 'Complete payment to confirm your enrollment',
      steps: {
        enrollment: 'Enrollment Details',
        payment: 'Payment Details',
        confirmation: 'Confirmation'
      },
      enrollmentDetails: {
        title: 'Enrollment Details',
        cohort: 'Cohort',
        participant: 'Participant',
        paymentPlan: 'Payment Plan',
        totalAmount: 'Total Amount',
        paidAmount: 'Paid',
        remainingAmount: 'Remaining',
        nextInstallment: 'Next Payment',
        dueDate: 'Due Date'
      },
      paymentPlans: {
        FULL: 'Full Payment',
        FIVE_INSTALLMENTS: '5 Installments',
        TWELVE_INSTALLMENTS: '12 Installments'
      },
      paymentDetails: {
        title: 'Payment Details',
        cardNumber: 'Card Number',
        cardHolder: 'Cardholder Name',
        expiryDate: 'Expiry Date',
        cvv: 'CVV',
        amount: 'Payment Amount',
        saveCard: 'Save card for future payments',
        useStoredCard: 'Use saved card',
        newCard: 'New Card',
        storedCards: 'Saved Cards',
        securePayment: 'Secure Payment'
      },
      tranzila: {
        processingTitle: 'Processing Payment...',
        processingMessage: 'Please wait while we process your payment',
        redirecting: 'Redirecting to secure payment page...',
        doNotClose: 'Do not close this window',
        returnFromPayment: 'Returning from payment processing...'
      },
      success: {
        title: 'Payment Successful!',
        message: 'Your enrollment is confirmed and payment processed',
        transactionId: 'Transaction ID',
        receipt: 'Receipt',
        downloadReceipt: 'Download Receipt',
        nextSteps: 'Next Steps',
        confirmationEmail: 'You will receive confirmation email within minutes',
        courseStart: 'Course starts on {date}',
        dashboard: 'Go to Dashboard',
        support: 'Contact Support'
      },
      failure: {
        title: 'Payment Failed',
        message: 'Sorry, the payment was not completed successfully',
        reason: 'Failure Reason',
        tryAgain: 'Try Again',
        contactSupport: 'Contact Support',
        backToEnrollment: 'Back to Enrollment'
      },
      buttons: {
        continue: 'Continue',
        back: 'Back',
        payNow: 'Pay Now',
        tryAgain: 'Try Again',
        goToDashboard: 'Go to Dashboard'
      },
      security: {
        sslSecured: 'SSL Secured',
        pciCompliant: 'PCI Compliant',
        securePayment: 'Secure Payment',
        tranzilaPowered: 'Powered by Tranzila'
      },
      errors: {
        required: 'Required field',
        invalidCard: 'Invalid card number',
        invalidExpiry: 'Invalid expiry date',
        invalidCvv: 'Invalid CVV',
        cardExpired: 'Card expired',
        paymentFailed: 'Payment failed',
        networkError: 'Network error - check your connection'
      }
    }
  };

  const t = content[locale];

  // Fetch enrollment details
  useEffect(() => {
    const fetchEnrollment = async () => {
      if (!enrollmentId) {
        router.push('/enroll');
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/v1/enrollments/${enrollmentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setEnrollment(data.data);
        } else {
          throw new Error('Failed to fetch enrollment');
        }
      } catch (error) {
        console.error('Failed to fetch enrollment:', error);
        // Mock data for demo
        setEnrollment({
          id: enrollmentId,
          status: 'PENDING_PAYMENT',
          paymentPlan: 'FIVE_INSTALLMENTS',
          totalAmount: 6400,
          paidAmount: 0,
          remainingAmount: 6400,
          nextInstallmentAmount: 1500,
          nextInstallmentDate: new Date().toISOString(),
          cohort: {
            id: '1',
            name: 'קבוצת חורף 2024',
            startDate: '2024-12-01T00:00:00Z'
          },
          user: {
            firstName: 'יוסי',
            lastName: 'כהן',
            email: 'yossi@example.com'
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollment();
  }, [enrollmentId, router]);

  // Handle payment from URL parameters (return from Tranzila)
  useEffect(() => {
    if (returnUrl) {
      setCurrentStep(3);
      const urlParams = new URLSearchParams(window.location.search);
      const response = urlParams.get('Response');
      const tranzilaResponse = urlParams.get('TranzilaTK');

      if (response === '000' || tranzilaResponse) {
        // Payment successful
        setPaymentResult({
          success: true,
          transactionId: urlParams.get('ConfirmationCode') || 'TXN-' + Date.now(),
          amount: enrollment?.nextInstallmentAmount || 1500,
          cardLast4: '****',
          timestamp: new Date().toISOString()
        });
      } else {
        // Payment failed
        setPaymentResult({
          success: false,
          error: urlParams.get('ErrorMessage') || 'תשלום נכשל',
          errorCode: response || 'UNKNOWN'
        });
      }
    }
  }, [returnUrl, enrollment]);

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
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const validatePaymentForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (useStoredCard) {
      if (!paymentMethod.token) {
        newErrors.storedCard = t.errors.required;
      }
    } else {
      if (!paymentMethod.cardLast4 || paymentMethod.cardLast4.length < 4) {
        newErrors.cardNumber = t.errors.invalidCard;
      }
      if (!paymentMethod.holderName?.trim()) {
        newErrors.holderName = t.errors.required;
      }
      if (!paymentMethod.expiryMonth || !paymentMethod.expiryYear) {
        newErrors.expiry = t.errors.invalidExpiry;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validatePaymentForm() || !enrollment) return;

    setIsProcessing(true);
    try {
      // Create Tranzila payment
      const paymentData = {
        token: paymentMethod.token,
        saveCard,
        cardLast4: paymentMethod.cardLast4,
        cardType: paymentMethod.cardType
      };

      const response = await fetch(`/api/v1/enrollments/${enrollment.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const result = await response.json();

        if (result.data.status === 'SUCCESS') {
          setPaymentResult({
            success: true,
            transactionId: result.data.transactionId,
            amount: result.data.amount,
            cardLast4: paymentMethod.cardLast4,
            timestamp: new Date().toISOString()
          });
          setCurrentStep(3);
        } else {
          throw new Error(result.data.reason || 'Payment failed');
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentResult({
        success: false,
        error: error instanceof Error ? error.message : t.errors.paymentFailed,
        errorCode: 'PAYMENT_ERROR'
      });
      setCurrentStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranzilaRedirect = () => {
    if (!enrollment) return;

    // Redirect to Tranzila hosted payment page
    const tranzilaUrl = new URL('https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi');
    tranzilaUrl.searchParams.set('supplier', process.env.NEXT_PUBLIC_TRANZILA_SUPPLIER || 'ttester');
    tranzilaUrl.searchParams.set('sum', (enrollment.nextInstallmentAmount || 1500).toString());
    tranzilaUrl.searchParams.set('currency', '1'); // ILS
    tranzilaUrl.searchParams.set('cred_type', '1'); // Credit card
    tranzilaUrl.searchParams.set('lang', locale === 'he' ? 'il' : 'us');
    tranzilaUrl.searchParams.set('order_id', enrollment.id);
    tranzilaUrl.searchParams.set('ordername', enrollment.cohort.name);
    tranzilaUrl.searchParams.set('client_name', `${enrollment.user.firstName} ${enrollment.user.lastName}`);
    tranzilaUrl.searchParams.set('client_email', enrollment.user.email);
    tranzilaUrl.searchParams.set('success_url', `${window.location.origin}/payment?enrollment=${enrollment.id}&return=success`);
    tranzilaUrl.searchParams.set('fail_url', `${window.location.origin}/payment?enrollment=${enrollment.id}&return=fail`);

    window.location.href = tranzilaUrl.toString();
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
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
            {step < 3 && (
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

  const renderEnrollmentDetails = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.enrollmentDetails.title}
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
          <div className="animate-pulse bg-gray-200 h-4 rounded w-1/2"></div>
        </div>
      ) : enrollment ? (
        <div className="bg-white rounded-xl p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t.enrollmentDetails.cohort}
              </h3>
              <p className="text-gray-600">{enrollment.cohort.name}</p>
              <p className="text-gray-600">{formatDate(enrollment.cohort.startDate)}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t.enrollmentDetails.participant}
              </h3>
              <p className="text-gray-600">{enrollment.user.firstName} {enrollment.user.lastName}</p>
              <p className="text-gray-600">{enrollment.user.email}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {t.enrollmentDetails.paymentPlan}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.enrollmentDetails.totalAmount}:</span>
                  <span className="font-semibold">{formatCurrency(enrollment.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.enrollmentDetails.paidAmount}:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(enrollment.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.enrollmentDetails.remainingAmount}:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(enrollment.remainingAmount)}</span>
                </div>
              </div>

              {enrollment.nextInstallmentAmount && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    {t.enrollmentDetails.nextInstallment}
                  </h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(enrollment.nextInstallmentAmount)}
                  </div>
                  {enrollment.nextInstallmentDate && (
                    <div className="text-sm text-blue-600 mt-1">
                      {t.enrollmentDetails.dueDate}: {formatDate(enrollment.nextInstallmentDate)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {t.paymentDetails.title}
      </h2>

      <div className="bg-white rounded-xl p-6 space-y-6">
        {/* Payment Amount */}
        <div className="text-center bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">{t.paymentDetails.amount}</div>
          <div className="text-3xl font-bold text-blue-600">
            {enrollment && formatCurrency(enrollment.nextInstallmentAmount || enrollment.totalAmount)}
          </div>
        </div>

        {/* Tranzila Hosted Payment Button */}
        <div className="space-y-4">
          <div className="text-center">
            <button
              onClick={handleTranzilaRedirect}
              disabled={isProcessing}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t.tranzila.processingTitle}
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  {t.buttons.payNow}
                </>
              )}
            </button>
          </div>

          {/* Security Badges */}
          <div className="flex justify-center items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Lock className="w-4 h-4" />
              {t.security.sslSecured}
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              {t.security.pciCompliant}
            </div>
            <div className="text-xs">
              {t.security.tranzilaPowered}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="font-medium">{t.paymentDetails.securePayment}</span>
            </div>
            <p>{t.tranzila.redirecting}</p>
            <p className="text-orange-600 font-medium">{t.tranzila.doNotClose}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <RefreshCw className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">
        {t.tranzila.processingTitle}
      </h2>
      <p className="text-gray-600">
        {t.tranzila.processingMessage}
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{t.tranzila.doNotClose}</span>
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      {paymentResult?.success ? (
        <>
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
              <span className="text-gray-600">{t.success.transactionId}:</span>
              <span className="font-mono text-sm">{paymentResult.transactionId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t.paymentDetails.amount}:</span>
              <span className="font-semibold">{formatCurrency(paymentResult.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">תאריך:</span>
              <span>{formatDate(paymentResult.timestamp)}</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              {t.success.nextSteps}
            </h3>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t.success.confirmationEmail}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {enrollment && t.success.courseStart.replace('{date}', formatDate(enrollment.cohort.startDate))}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t.success.support}
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              {t.success.dashboard}
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t.success.downloadReceipt}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">
              {t.failure.title}
            </h2>
            <p className="text-gray-600">
              {t.failure.message}
            </p>
          </div>

          <div className="bg-red-50 rounded-xl p-6">
            <div className="text-sm text-red-700">
              <strong>{t.failure.reason}:</strong> {paymentResult?.error}
            </div>
            {paymentResult?.errorCode && (
              <div className="text-xs text-red-600 mt-1">
                קוד שגיאה: {paymentResult.errorCode}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t.failure.tryAgain}
            </button>
            <button
              onClick={() => router.push('/contact')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.failure.contactSupport}
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (isProcessing) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-md w-full mx-4">
          {renderProcessing()}
        </div>
      </div>
    );
  }

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
          {currentStep === 1 && renderEnrollmentDetails()}
          {currentStep === 2 && renderPaymentDetails()}
          {currentStep === 3 && renderConfirmation()}

          {currentStep < 3 && !isProcessing && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.buttons.back}
                </button>
              )}

              <div className="flex-1" />

              {currentStep === 1 && (
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.buttons.continue}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}