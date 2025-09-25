import OAuthLoginButton from '@/components/OAuthLoginButton';

interface LoginPageProps {
  params: Promise<{
    locale: 'he' | 'en';
  }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  return <OAuthLoginButton locale={locale} />;
}