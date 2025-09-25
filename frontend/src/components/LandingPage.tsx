'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, Users, CheckCircle, Star, ArrowRight, Play } from 'lucide-react';
import { localeDirections, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

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
  enrollment: {
    canEnroll: boolean;
    message: string;
  };
}

interface LandingPageProps {
  locale: Locale;
}

export default function LandingPage({ locale }: LandingPageProps) {
  const [currentCohort, setCurrentCohort] = useState<Cohort | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  const isRTL = localeDirections[locale] === 'rtl';

  // Get translations
  const t = useTranslations('landing');
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');

  // Add loading state for translations
  let hasTranslations = false;
  try {
    hasTranslations = Boolean(t('features.title')) && Boolean(t.raw('features.items'));
  } catch (error) {
    console.log('Translation not ready:', error);
  }

  if (!hasTranslations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading translations...</p>
        </div>
      </div>
    );
  }


  // Fetch current cohort data
  useEffect(() => {
    const fetchCurrentCohort = async () => {
      try {
        const response = await fetch('/api/v1/cohorts/current');
        if (response.ok) {
          const data = await response.json();
          setCurrentCohort(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch current cohort:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentCohort();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100", isRTL ? 'rtl' : 'ltr')}>
      {/* Hero Section */}
      <section className="relative hero-gradient text-white py-16 sm:py-20 lg:py-24 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full animate-float" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-white rounded-full animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-1/3 w-32 h-32 bg-white rounded-full animate-float" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10 px-2 sm:px-0">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("space-y-6 sm:space-y-8 text-center", isRTL ? 'lg:text-right' : 'lg:text-left')}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-block px-4 py-2 glass-strong rounded-full text-sm font-medium mb-4"
              >
                ✨ תכנית פיתוח אישי מקצועית
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-balance">
                <span className="block">{t('hero.title')}</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-blue-100 font-medium leading-relaxed max-w-2xl px-4 sm:px-0">
                {t('hero.subtitle')}
              </p>

              <p className="text-base sm:text-lg text-blue-200 leading-relaxed max-w-xl px-4 sm:px-0">
                {t('hero.description')}
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-4 px-2 sm:px-0"
              >
                <Link
                  href={`/${locale}/enroll`}
                  className="group relative bg-white text-blue-600 px-6 sm:px-8 py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-blue-50 transition-all duration-300 inline-flex items-center justify-center gap-3 button-glow shadow-button hover:shadow-button-hover hover:scale-105 active:scale-95 touch-target min-h-[56px] w-full sm:w-auto"
                >
                  <span className="text-center">{t('hero.cta')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </Link>

                <button
                  onClick={() => setShowVideo(true)}
                  className="group glass-strong text-white px-6 sm:px-8 py-4 rounded-xl font-semibold text-base sm:text-lg hover:backdrop-blur-xl transition-all duration-300 inline-flex items-center justify-center gap-3 hover:scale-105 active:scale-95 touch-target min-h-[56px] w-full sm:w-auto"
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-center">{t('hero.watchVideo')}</span>
                </button>
              </motion.div>
            </motion.div>

            {/* Current Cohort Info */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="card-glass shadow-glass hover:shadow-2xl transition-all duration-500 group"
            >
              <h3 className="text-2xl font-bold mb-6 group-hover:text-blue-100 transition-colors">{t('cohort.title')}</h3>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse bg-white/20 h-4 rounded-lg"></div>
                  <div className="animate-pulse bg-white/20 h-4 rounded-lg w-3/4"></div>
                  <div className="animate-pulse bg-white/20 h-4 rounded-lg w-1/2"></div>
                </div>
              ) : currentCohort ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-blue-100">{t('cohort.startDate')}</div>
                      <div className="text-white font-medium">{formatDate(currentCohort.startDate)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-blue-100">{t('cohort.location')}</div>
                      <div className="text-white font-medium">{currentCohort.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-blue-100">{t('cohort.schedule')}</div>
                      <div className="text-white font-medium">{currentCohort.schedule}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-blue-100">{t('cohort.spotsAvailable')}</div>
                      <div className="text-white font-medium">
                        {currentCohort.capacity.available} / {currentCohort.capacity.maximum}
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(currentCohort.capacity.current / currentCohort.capacity.maximum) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {currentCohort.enrollment.canEnroll && (
                    <div className="mt-8">
                      <Link
                        href="/enroll"
                        className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center py-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-button hover:shadow-button-hover"
                      >
                        🚀 {t('hero.cta')}
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-blue-100">
                  אין קבוצה פעילה כרגע
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 relative">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6 text-balance">
              {t('features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              גלה את הכלים והמיומנויות שישנו את חייך לטובה
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.isArray(t.raw('features.items')) && (t.raw('features.items') as Array<{title: string; description: string}>).map((feature, index: number) => {
              const icons = [CheckCircle, Star, Users, ArrowRight];
              const colors = ['blue', 'purple', 'green', 'orange'];
              const IconComponent = icons[index % icons.length];
              const color = colors[index % colors.length];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <div className="card group-hover:shadow-card-hover h-full border-t-4 border-blue-500 relative overflow-hidden">
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:to-purple-50/50 transition-all duration-500"></div>

                    <div className="relative z-10">
                      <div className={`w-14 h-14 bg-gradient-to-br from-${color}-100 to-${color}-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className={`w-7 h-7 text-${color}-600 group-hover:text-${color}-700`} />
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors">
                        {feature.title}
                      </h3>

                      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                        {feature.description}
                      </p>

                      {/* Decorative element */}
                      <div className="absolute top-4 right-4 w-2 h-2 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </div>
                </motion.div>
              );
            }) || []}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-600 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-600 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6 text-balance">
              {t('testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              שמעו מה אומרים בוגרי התכנית שלנו
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10">
            {Array.isArray(t.raw('testimonials.items')) && (t.raw('testimonials.items') as Array<{name: string; text: string; role: string}>).map((testimonial, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <div className="card group-hover:shadow-2xl relative overflow-hidden border border-blue-100 group-hover:border-blue-200">
                  {/* Quote decoration */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-100 to-transparent opacity-50"></div>
                  <div className="absolute top-4 right-4 text-4xl text-blue-300 font-serif opacity-30">”</div>

                  <div className="relative z-10">
                    <div className="flex items-center mb-6">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <Star className="w-6 h-6 text-yellow-400 fill-current" />
                        </motion.div>
                      ))}
                    </div>

                    <blockquote className="text-gray-700 text-lg mb-8 leading-relaxed font-medium relative">
                      <span className="text-3xl text-blue-300 absolute -top-2 -left-2 font-serif opacity-50">“</span>
                      <span className="relative z-10">{testimonial.text}</span>
                    </blockquote>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {testimonial.name}
                        </div>
                        <div className="text-gray-600 font-medium">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) || []}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 relative">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6 text-balance">
              {t('pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              בחרו את המסלול שמתאים לכם ביותר
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="card shadow-2xl border border-blue-100 relative overflow-hidden group">
              {/* Premium badge */}
              <div className="absolute top-0 right-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-b-lg font-bold text-sm">
                ✨ מומלץ
              </div>

              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 p-12">
                <div className="text-center mb-12">
                  <div className="text-6xl font-extrabold gradient-text mb-4">
                    {t('pricing.priceLabel')}
                  </div>
                  <div className="text-gray-600 text-lg font-medium space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>{t('pricing.fullPayment')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>{t('pricing.installments5')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span>{t('pricing.installments12')}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-12">
                  <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                    {t('pricing.includes')}:
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Array.isArray(t.raw('pricing.features')) && (t.raw('pricing.features') as string[]).map((feature: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <span className="text-gray-700 font-medium">{feature}</span>
                      </motion.div>
                    )) || []}
                  </div>
                </div>

                <Link
                  href="/enroll"
                  className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-5 rounded-xl font-bold text-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-button hover:shadow-button-hover button-glow"
                >
                  🚀 {t('hero.cta')}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Consultation CTA */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 hero-gradient text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-32 h-32 bg-white rounded-full animate-float" style={{animationDelay: '0s'}}></div>
          <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-white rounded-full animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 right-10 w-16 h-16 bg-white rounded-full animate-float" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-extrabold mb-8 text-balance">
              {t('consultation.title')}
            </h2>
            <p className="text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t('consultation.description')}
            </p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Link
                href="/consultation"
                className="inline-flex items-center gap-3 bg-white text-blue-600 px-10 py-5 rounded-xl font-bold text-xl hover:bg-blue-50 transition-all duration-300 hover:scale-105 active:scale-95 shadow-button hover:shadow-button-hover button-glow group"
              >
                <span>{t('consultation.bookConsultation')}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-blue-200 mt-6 text-sm"
            >
              📞 יעוץ חינם ללא התחייבות
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <h3 className="text-2xl font-bold">
                🎥 סרטון הכרות עם התכנית
              </h3>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowVideo(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition-colors"
              >
                ×
              </motion.button>
            </div>
            <div className="aspect-video bg-gray-900 relative">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
              {/* Loading overlay */}
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}