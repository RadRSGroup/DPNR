'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, CheckCircle, Star, ArrowRight, Play } from 'lucide-react';

export default function DemoPage() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-700/20 to-indigo-800/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>

        <div className="container mx-auto max-w-7xl relative z-10 px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6 sm:space-y-8 text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-block px-4 py-2 glass-strong rounded-full text-sm font-medium mb-4 text-white"
              >
                ✨ תכנית פיתוח אישי מקצועית
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-balance text-white">
                <span className="block">YOU ARE THE MOST VALUABLE</span>
                <span className="block gradient-text">RESOURCE IN THE WORLD</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-blue-100 font-medium leading-relaxed max-w-2xl">
                Become Your 2.0 Self
              </p>

              <p className="text-base sm:text-lg text-blue-200 leading-relaxed max-w-xl">
                תכנית פיתוח אישי ומקצועי מתקדמת עם ליטל שושן
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-4"
              >
                <button className="group relative bg-white text-blue-600 px-6 sm:px-8 py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-blue-50 transition-all duration-300 inline-flex items-center justify-center gap-3 button-glow shadow-button hover:shadow-button-hover hover:scale-105 active:scale-95 touch-target min-h-[56px] w-full sm:w-auto">
                  <span className="text-center">המסע שלך מתחיל עכשיו</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </button>

                <button
                  onClick={() => setShowVideo(true)}
                  className="group glass-strong text-white px-6 sm:px-8 py-4 rounded-xl font-semibold text-base sm:text-lg hover:backdrop-blur-xl transition-all duration-300 inline-flex items-center justify-center gap-3 hover:scale-105 active:scale-95 touch-target min-h-[56px] w-full sm:w-auto"
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-center">צפו בסרטון</span>
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="glass-strong rounded-2xl p-8 backdrop-blur-xl">
                  <h3 className="text-2xl font-bold text-white mb-6">✅ Frontend Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <span>Modern Design - Glass morphism, animations</span>
                    </div>
                    <div className="flex items-center gap-3 text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <span>Responsive Layout - Mobile-first breakpoints</span>
                    </div>
                    <div className="flex items-center gap-3 text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <span>RTL Support - Hebrew & English layouts</span>
                    </div>
                    <div className="flex items-center gap-3 text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <span>Performance - Optimized fonts & animations</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Course Info */}
      <section className="py-16 bg-white/10 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass-strong rounded-xl p-6 text-center text-white"
            >
              <Calendar className="w-8 h-8 mx-auto mb-4 text-blue-300" />
              <h3 className="text-lg font-semibold mb-2">5 חודשים</h3>
              <p className="text-sm text-blue-200">20 מפגשים</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-strong rounded-xl p-6 text-center text-white"
            >
              <MapPin className="w-8 h-8 mx-auto mb-4 text-blue-300" />
              <h3 className="text-lg font-semibold mb-2">מזכרת בתיה</h3>
              <p className="text-sm text-blue-200">מיקום נגיש</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-strong rounded-xl p-6 text-center text-white"
            >
              <Users className="w-8 h-8 mx-auto mb-4 text-blue-300" />
              <h3 className="text-lg font-semibold mb-2">קבוצה קטנה</h3>
              <p className="text-sm text-blue-200">עד 20 משתתפים</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            אפשרויות תשלום
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="glass-strong rounded-xl p-6 text-center text-white hover:scale-105 transition-transform"
            >
              <Star className="w-8 h-8 mx-auto mb-4 text-yellow-400" />
              <h3 className="text-xl font-bold mb-2">תשלום מלא</h3>
              <div className="text-3xl font-bold mb-4">₪6,400</div>
              <p className="text-sm text-blue-200">הזדמנות יחידה</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-strong rounded-xl p-6 text-center text-white hover:scale-105 transition-transform border-2 border-yellow-400"
            >
              <Star className="w-8 h-8 mx-auto mb-4 text-yellow-400" />
              <h3 className="text-xl font-bold mb-2">5 תשלומים</h3>
              <div className="text-3xl font-bold mb-4">₪1,360</div>
              <p className="text-sm text-blue-200">הכי פופולרי</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-strong rounded-xl p-6 text-center text-white hover:scale-105 transition-transform"
            >
              <Calendar className="w-8 h-8 mx-auto mb-4 text-blue-300" />
              <h3 className="text-xl font-bold mb-2">12 תשלומים</h3>
              <div className="text-3xl font-bold mb-4">₪580</div>
              <p className="text-sm text-blue-200">נוח ונגיש</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}