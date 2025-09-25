import LandingPage from '@/components/LandingPage';
import { Locale } from '@/i18n/config';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  return <LandingPage locale={locale} />;
}
