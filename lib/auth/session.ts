import { auth } from '@/auth';

export type RequiredSession = {
  userId: string;
  role: 'admin' | 'editor';
  name: string;
  email: string;
};

export async function getRequiredSession(): Promise<RequiredSession> {
  const session = await auth();

  if (!session?.user?.id || !session.user.role || !session.user.email || !session.user.name) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
  };
}

export function assertAdmin(role: RequiredSession['role']) {
  if (role !== 'admin') {
    throw new Response('Forbidden', { status: 403 });
  }
}
