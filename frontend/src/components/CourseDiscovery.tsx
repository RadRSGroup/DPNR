'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Star,
  ArrowRight,
  Filter,
  Search,
  PlayCircle,
  Download,
  BookOpen,
  Trophy,
  Heart
} from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  schedule: string;
  status: 'UPCOMING' | 'OPEN_ENROLLMENT' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED';
  capacity: {
    maximum: number;
    current: number;
    available: number;
  };
  enrollment: {
    canEnroll: boolean;
    message: string;
  };
  statistics?: {
    enrollmentCount: number;
    completionRate: number;
    satisfaction: number;
  };
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  materials: string[];
}

interface CourseDiscoveryProps {
  locale?: 'he' | 'en';
}

export default function CourseDiscovery({ locale = 'he' }: CourseDiscoveryProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [filteredCohorts, setFilteredCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming' | 'in_progress'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  const isRTL = locale === 'he';

  // Content in both languages
  const content = {
    he: {
      title: 'גלה את התכניות שלנו',
      subtitle: 'בחר את הקבוצה המתאימה לך ותתחיל את המסע שלך לפיתוח אישי ומקצועי',
      search: 'חפש קבוצות...',
      filters: {
        all: 'הכל',
        available: 'זמינות להרשמה',
        upcoming: 'עתידות',
        inProgress: 'בתהליך'
      },
      cohortCard: {
        startDate: 'תאריך התחלה',
        location: 'מיקום',
        schedule: 'לוח זמנים',
        spotsLeft: 'מקומות נותרו',
        spotsAvailable: 'מקומות זמינים',
        enrollNow: 'הרשמה עכשיו',
        learnMore: 'למידע נוסף',
        full: 'מלא',
        inProgress: 'בתהליך',
        completed: 'הושלם'
      },
      courseContent: {
        title: 'תוכן הקורס',
        modules: 'מודולים',
        totalDuration: 'משך כולל',
        materials: 'חומרי לימוד',
        downloadMaterials: 'הורדת חומרים'
      },
      features: {
        title: 'מה כלול בתכנית',
        personalGuidance: 'ליווי אישי',
        groupSessions: 'מפגשי קבוצה',
        digitalMaterials: 'חומרים דיגיטליים',
        community: 'קהילה תומכת',
        certificate: 'תעודת השלמה',
        followUp: 'מעקב והערכה'
      },
      testimonials: {
        title: 'חוויות בוגרים',
        satisfaction: 'שביעות רצון',
        completion: 'שיעור השלמה',
        graduates: 'בוגרים'
      },
      noResults: 'לא נמצאו קבוצות המתאימות לחיפוש',
      tryDifferentSearch: 'נסה מילות חיפוש אחרות או שנה את הפילטרים'
    },
    en: {
      title: 'Discover Our Programs',
      subtitle: 'Choose the cohort that suits you and start your journey of personal and professional development',
      search: 'Search cohorts...',
      filters: {
        all: 'All',
        available: 'Available',
        upcoming: 'Upcoming',
        inProgress: 'In Progress'
      },
      cohortCard: {
        startDate: 'Start Date',
        location: 'Location',
        schedule: 'Schedule',
        spotsLeft: 'Spots Left',
        spotsAvailable: 'Spots Available',
        enrollNow: 'Enroll Now',
        learnMore: 'Learn More',
        full: 'Full',
        inProgress: 'In Progress',
        completed: 'Completed'
      },
      courseContent: {
        title: 'Course Content',
        modules: 'Modules',
        totalDuration: 'Total Duration',
        materials: 'Learning Materials',
        downloadMaterials: 'Download Materials'
      },
      features: {
        title: 'What\'s Included',
        personalGuidance: 'Personal Guidance',
        groupSessions: 'Group Sessions',
        digitalMaterials: 'Digital Materials',
        community: 'Supportive Community',
        certificate: 'Certificate of Completion',
        followUp: 'Follow-up & Assessment'
      },
      testimonials: {
        title: 'Graduate Experiences',
        satisfaction: 'Satisfaction',
        completion: 'Completion Rate',
        graduates: 'Graduates'
      },
      noResults: 'No cohorts found matching your search',
      tryDifferentSearch: 'Try different search terms or change filters'
    }
  };

  const t = content[locale];

  // Sample course modules
  const courseModules: CourseModule[] = [
    {
      id: '1',
      title: locale === 'he' ? 'הכרת העצמי והגדרת מטרות' : 'Self-Discovery & Goal Setting',
      description: locale === 'he' ? 'למידת כלים לזיהוי חוזקות ואתגרים אישיים' : 'Learning tools for identifying personal strengths and challenges',
      duration: '3 שעות',
      videoUrl: 'https://example.com/video1',
      materials: ['מדריך PDF', 'תרגילים מעשיים', 'כלי הערכה עצמית']
    },
    {
      id: '2',
      title: locale === 'he' ? 'תכנון אסטרטגי אישי' : 'Personal Strategic Planning',
      description: locale === 'he' ? 'בניית תכנית פעולה מותאמת אישית' : 'Building a personalized action plan',
      duration: '2.5 שעות',
      videoUrl: 'https://example.com/video2',
      materials: ['תבניות תכנון', 'דוגמאות מעשיות', 'כלי מעקב']
    },
    {
      id: '3',
      title: locale === 'he' ? 'כלים לשינוי הרגלים' : 'Habit Change Tools',
      description: locale === 'he' ? 'שיטות מוכחות ליצירת הרגלים חיוביים' : 'Proven methods for creating positive habits',
      duration: '2 שעות',
      videoUrl: 'https://example.com/video3',
      materials: ['מעקב הרגלים', 'טכניקות מוטיבציה', 'תרגילים יומיים']
    }
  ];

  // Fetch cohorts data
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const response = await fetch('/api/v1/cohorts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCohorts(data.data || []);
          setFilteredCohorts(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch cohorts:', error);
        // Set mock data for demo
        const mockCohorts = [
          {
            id: '1',
            name: 'קבוצת חורף 2024',
            startDate: '2024-12-01T00:00:00Z',
            endDate: '2025-03-01T00:00:00Z',
            location: 'מזכרת בתיה',
            schedule: 'ימי רביעי בערב, 19:00-21:30',
            status: 'OPEN_ENROLLMENT' as const,
            capacity: { maximum: 20, current: 12, available: 8 },
            enrollment: { canEnroll: true, message: 'הרשמה פתוחה' },
            statistics: { enrollmentCount: 12, completionRate: 95, satisfaction: 4.8 }
          },
          {
            id: '2',
            name: 'קבוצת אביב 2025',
            startDate: '2025-03-15T00:00:00Z',
            endDate: '2025-06-15T00:00:00Z',
            location: 'מזכרת בתיה',
            schedule: 'ימי שני בערב, 19:00-21:30',
            status: 'UPCOMING' as const,
            capacity: { maximum: 20, current: 0, available: 20 },
            enrollment: { canEnroll: false, message: 'הרשמה תיפתח בקרוב' },
            statistics: { enrollmentCount: 0, completionRate: 0, satisfaction: 0 }
          }
        ];
        setCohorts(mockCohorts);
        setFilteredCohorts(mockCohorts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, []);

  // Filter and search logic
  useEffect(() => {
    let filtered = cohorts;

    // Apply status filter
    if (filter !== 'all') {
      switch (filter) {
        case 'available':
          filtered = filtered.filter(c => c.enrollment.canEnroll);
          break;
        case 'upcoming':
          filtered = filtered.filter(c => c.status === 'UPCOMING');
          break;
        case 'in_progress':
          filtered = filtered.filter(c => c.status === 'IN_PROGRESS');
          break;
      }
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(cohort =>
        cohort.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cohort.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cohort.schedule.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCohorts(filtered);
  }, [cohorts, filter, searchTerm]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN_ENROLLMENT':
        return 'bg-green-100 text-green-800';
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'FULL':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, enrollment: any) => {
    if (!enrollment.canEnroll && status === 'OPEN_ENROLLMENT') {
      return t.cohortCard.full;
    }
    switch (status) {
      case 'IN_PROGRESS':
        return t.cohortCard.inProgress;
      case 'COMPLETED':
        return t.cohortCard.completed;
      default:
        return enrollment.message;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header Section */}
      <section className="bg-white shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              {t.title}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              {Object.entries(t.filters).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cohorts Grid */}
      <section className="container mx-auto max-w-6xl px-4 py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredCohorts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCohorts.map((cohort) => (
              <div key={cohort.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {cohort.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cohort.status)}`}>
                      {getStatusText(cohort.status, cohort.enrollment)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{formatDate(cohort.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{cohort.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{cohort.schedule}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {cohort.capacity.available > 0
                          ? `${cohort.capacity.available} ${t.cohortCard.spotsLeft}`
                          : t.cohortCard.full
                        }
                      </span>
                    </div>
                  </div>

                  {cohort.statistics && (
                    <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {cohort.statistics.satisfaction}
                        </div>
                        <div className="text-xs text-gray-600">{t.testimonials.satisfaction}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {cohort.statistics.completionRate}%
                        </div>
                        <div className="text-xs text-gray-600">{t.testimonials.completion}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">
                          {cohort.statistics.enrollmentCount}
                        </div>
                        <div className="text-xs text-gray-600">{t.testimonials.graduates}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {cohort.enrollment.canEnroll ? (
                      <Link
                        href={`/enroll?cohort=${cohort.id}`}
                        className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        {t.cohortCard.enrollNow}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-500 text-center py-3 rounded-lg font-semibold cursor-not-allowed"
                      >
                        {getStatusText(cohort.status, cohort.enrollment)}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCohort(cohort)}
                      className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t.cohortCard.learnMore}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t.noResults}
            </h3>
            <p className="text-gray-600">
              {t.tryDifferentSearch}
            </p>
          </div>
        )}
      </section>

      {/* Course Content Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            {t.courseContent.title}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {courseModules.map((module, index) => (
              <div key={module.id} className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {module.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  {module.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {module.duration}
                  </span>
                  {module.videoUrl && (
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      וידאו
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {module.materials.map((material, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Download className="w-3 h-3" />
                      {material}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            {t.features.title}
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Heart, title: t.features.personalGuidance },
              { icon: Users, title: t.features.groupSessions },
              { icon: BookOpen, title: t.features.digitalMaterials },
              { icon: Users, title: t.features.community },
              { icon: Trophy, title: t.features.certificate },
              { icon: CheckCircle, title: t.features.followUp }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-semibold text-gray-800">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cohort Details Modal */}
      {selectedCohort && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedCohort.name}
                  </h3>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCohort.status)}`}>
                    {getStatusText(selectedCohort.status, selectedCohort.enrollment)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCohort(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{t.cohortCard.startDate}</div>
                      <div className="text-gray-600">{formatDate(selectedCohort.startDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{t.cohortCard.location}</div>
                      <div className="text-gray-600">{selectedCohort.location}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{t.cohortCard.schedule}</div>
                      <div className="text-gray-600">{selectedCohort.schedule}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{t.cohortCard.spotsAvailable}</div>
                      <div className="text-gray-600">
                        {selectedCohort.capacity.available} / {selectedCohort.capacity.maximum}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCohort.enrollment.canEnroll && (
                <div className="mt-6">
                  <Link
                    href={`/enroll?cohort=${selectedCohort.id}`}
                    className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t.cohortCard.enrollNow}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}