'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return session.user;
}

export async function getUsers() {
  await requireAdmin();
  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });
  // Exclude passwordHash from response
  return allUsers.map(({ passwordHash, ...user }) => user);
}

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'operator';
}) {
  await requireAdmin();

  const passwordHash = await bcrypt.hash(data.password, 10);

  await db.insert(users).values({
    id: nanoid(),
    username: data.username,
    passwordHash,
    name: data.name,
    role: data.role,
  });

  revalidatePath('/more/users');
}

export async function updateUser(id: string, data: {
  name?: string;
  role?: 'admin' | 'operator';
  password?: string;
}) {
  await requireAdmin();

  const updateData: Record<string, unknown> = {};

  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));

  revalidatePath('/more/users');
}

export async function deleteUser(id: string) {
  const currentUser = await requireAdmin();

  if (currentUser.id === id) {
    throw new Error('Cannot delete yourself');
  }

  await db.delete(users).where(eq(users.id, id));
  revalidatePath('/more/users');
}
