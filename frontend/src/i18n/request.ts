import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  console.log('getRequestConfig called with locale:', locale);

  // Default to English if no locale is provided
  const validLocale = locale || 'en';

  // Ensure only valid locales are used
  const allowedLocales = ['en', 'he'];
  const finalLocale = allowedLocales.includes(validLocale) ? validLocale : 'en';

  console.log('Using final locale:', finalLocale);

  try {
    const messages = (await import(`../../messages/${finalLocale}.json`)).default;
    console.log('Messages loaded successfully for:', finalLocale);

    return {
      locale: finalLocale,
      messages
    };
  } catch (error) {
    console.error('Error loading messages for locale:', finalLocale, error);
    throw error;
  }
});