'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cookie,
  Settings,
  X,
  CheckCircle,
  Shield,
  BarChart3,
  Target,
  Sliders
} from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface CookieConsentProps {
  locale?: 'he' | 'en';
}

export default function CookieConsent({ locale = 'he' }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false
  });

  const isRTL = locale === 'he';

  const content = {
    he: {
      title: 'הודעה על עוגיות',
      description: 'אנחנו משתמשים בעוגיות כדי לשפר את החוויה שלכם באתר ולהציג תוכן מותאם אישית.',
      learnMore: 'למידע נוסף',
      acceptAll: 'אשר הכל',
      rejectAll: 'דחה הכל',
      customize: 'התאמה אישית',
      savePreferences: 'שמור העדפות',
      cookieTypes: {
        essential: {
          title: 'עוגיות חיוניות',
          description: 'עוגיות אלה הכרחיות לתפקוד האתר ולא ניתן לכבות אותן',
          required: true
        },
        analytics: {
          title: 'עוגיות אנליטיות',
          description: 'עוגיות אלה עוזרות לנו להבין איך משתמשים באתר ולשפר אותו',
          required: false
        },
        marketing: {
          title: 'עוגיות שיווקיות',
          description: 'עוגיות אלה משמשות להצגת פרסומות מותאמות',
          required: false
        },
        preferences: {
          title: 'עוגיות העדפות',
          description: 'עוגיות אלה שומרות את ההעדפות והגדרות שלכם',
          required: false
        }
      },
      details: {
        title: 'פרטים על עוגיות',
        whatAreCookies: 'מה הן עוגיות?',
        whatAreCookiesDesc: 'עוגיות הן קבצי טקסט קטנים שנשמרים במחשב או במכשיר הנייד שלכם כאשר אתם מבקרים באתר.',
        whyWeUse: 'למה אנחנו משתמשים בעוגיות?',
        whyWeUseDesc: 'אנחנו משתמשים בעוגיות כדי לזכור את ההעדפות שלכם, לשפר את הביצועים ולהציג תוכן רלוונטי.',
        manageCookies: 'איך לנהל עוגיות?',
        manageCookiesDesc: 'אתם יכולים לנהל את העדפות העוגיות בכל עת דרך הגדרות הדפדפן או דרך מרכז הפרטיות שלנו.',
        thirdParty: 'עוגיות צד שלישי',
        thirdPartyDesc: 'חלק מהעוגיות מגיעות משירותי צד שלישי כמו Google Analytics ו-Facebook Pixel.'
      },
      actions: {
        close: 'סגור',
        configure: 'הגדר',
        accept: 'אשר',
        reject: 'דחה'
      }
    },
    en: {
      title: 'Cookie Notice',
      description: 'We use cookies to improve your experience on our site and to show personalized content.',
      learnMore: 'Learn more',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      customize: 'Customize',
      savePreferences: 'Save Preferences',
      cookieTypes: {
        essential: {
          title: 'Essential Cookies',
          description: 'These cookies are necessary for the website to function and cannot be disabled',
          required: true
        },
        analytics: {
          title: 'Analytics Cookies',
          description: 'These cookies help us understand how the website is used and improve it',
          required: false
        },
        marketing: {
          title: 'Marketing Cookies',
          description: 'These cookies are used to show personalized advertisements',
          required: false
        },
        preferences: {
          title: 'Preference Cookies',
          description: 'These cookies remember your preferences and settings',
          required: false
        }
      },
      details: {
        title: 'Cookie Details',
        whatAreCookies: 'What are cookies?',
        whatAreCookiesDesc: 'Cookies are small text files stored on your computer or mobile device when you visit a website.',
        whyWeUse: 'Why do we use cookies?',
        whyWeUseDesc: 'We use cookies to remember your preferences, improve performance, and show relevant content.',
        manageCookies: 'How to manage cookies?',
        manageCookiesDesc: 'You can manage cookie preferences at any time through your browser settings or our privacy center.',
        thirdParty: 'Third-party cookies',
        thirdPartyDesc: 'Some cookies come from third-party services like Google Analytics and Facebook Pixel.'
      },
      actions: {
        close: 'Close',
        configure: 'Configure',
        accept: 'Accept',
        reject: 'Reject'
      }
    }
  };

  const t = content[locale];

  // Check if consent is needed
  useEffect(() => {
    const hasConsent = localStorage.getItem('cookieConsent');
    if (!hasConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = async () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true
    };

    await saveCookiePreferences(allAccepted);
    setIsVisible(false);
  };

  const handleRejectAll = async () => {
    const onlyEssential = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false
    };

    await saveCookiePreferences(onlyEssential);
    setIsVisible(false);
  };

  const handleSavePreferences = async () => {
    await saveCookiePreferences(preferences);
    setIsVisible(false);
  };

  const saveCookiePreferences = async (prefs: CookiePreferences) => {
    try {
      // Save to localStorage
      localStorage.setItem('cookieConsent', JSON.stringify({
        preferences: prefs,
        timestamp: new Date().toISOString()
      }));

      // Send to backend
      await fetch('/api/v1/privacy/cookie-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(prefs)
      });

      // Initialize tracking scripts based on preferences
      if (prefs.analytics) {
        initializeAnalytics();
      }
      if (prefs.marketing) {
        initializeMarketing();
      }

    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
    }
  };

  const initializeAnalytics = () => {
    // Initialize Google Analytics or other analytics tools
    console.log('Analytics initialized');
  };

  const initializeMarketing = () => {
    // Initialize marketing pixels (Facebook, Google Ads, etc.)
    console.log('Marketing tracking initialized');
  };

  const getCookieIcon = (type: keyof typeof t.cookieTypes) => {
    switch (type) {
      case 'essential':
        return Shield;
      case 'analytics':
        return BarChart3;
      case 'marketing':
        return Target;
      case 'preferences':
        return Sliders;
      default:
        return Cookie;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="relative h-full flex items-end md:items-center justify-center p-4">
        <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {t.title}
                </h2>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              {t.description}
            </p>

            {!showDetails ? (
              // Simple view
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {t.acceptAll}
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t.rejectAll}
                  </button>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="px-6 py-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {t.customize}
                  </button>
                </div>

                <div className="text-center">
                  <Link
                    href="/privacy-policy"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    {t.learnMore}
                  </Link>
                </div>
              </div>
            ) : (
              // Detailed view
              <div className="space-y-6">
                {/* Cookie Categories */}
                <div className="space-y-4">
                  {Object.entries(t.cookieTypes).map(([key, config]) => {
                    const Icon = getCookieIcon(key as keyof typeof t.cookieTypes);
                    const isRequired = config.required;
                    const isEnabled = preferences[key as keyof CookiePreferences];

                    return (
                      <div key={key} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-800">
                                  {config.title}
                                </h3>
                                {isRequired && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    חובה
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {config.description}
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              disabled={isRequired}
                              onChange={(e) => setPreferences(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }))}
                              className="sr-only peer"
                            />
                            <div className={`relative w-11 h-6 rounded-full peer transition-colors ${
                              isEnabled
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            } ${isRequired ? 'opacity-50' : 'peer-focus:ring-4 peer-focus:ring-blue-300'}`}>
                              <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                                isEnabled ? 'translate-x-full' : ''
                              }`} />
                            </div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cookie Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    {t.details.title}
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <strong>{t.details.whatAreCookies}</strong>
                      <p>{t.details.whatAreCookiesDesc}</p>
                    </div>
                    <div>
                      <strong>{t.details.whyWeUse}</strong>
                      <p>{t.details.whyWeUseDesc}</p>
                    </div>
                    <div>
                      <strong>{t.details.manageCookies}</strong>
                      <p>{t.details.manageCookiesDesc}</p>
                    </div>
                    <div>
                      <strong>{t.details.thirdParty}</strong>
                      <p>{t.details.thirdPartyDesc}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t.savePreferences}
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t.actions.close}
                  </button>
                </div>

                <div className="text-center">
                  <Link
                    href="/privacy-policy"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    {t.learnMore}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}