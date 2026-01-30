'use server';

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

export async function login(formData: FormData) {
  try {
    await signIn('credentials', {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid username or password' };
    }
    throw error;
  }
}
