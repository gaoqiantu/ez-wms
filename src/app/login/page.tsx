import { LoginForm } from './login-form';
import { LanguageToggle } from '@/components/layout/language-toggle';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <LoginForm />
    </div>
  );
}
