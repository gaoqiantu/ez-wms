import { db } from './index';
import { users, locations, settings } from './schema';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    id: nanoid(),
    username: 'admin',
    passwordHash: adminPassword,
    name: 'Administrator',
    role: 'admin',
  }).onConflictDoNothing();

  console.log('Created admin user (admin / admin123)');

  // Create sample locations
  const sampleLocations = [
    { id: nanoid(), code: 'A-01', name: 'Aisle A Row 1', sortOrder: 1 },
    { id: nanoid(), code: 'A-02', name: 'Aisle A Row 2', sortOrder: 2 },
    { id: nanoid(), code: 'B-01', name: 'Aisle B Row 1', sortOrder: 3 },
    { id: nanoid(), code: 'B-02', name: 'Aisle B Row 2', sortOrder: 4 },
    { id: nanoid(), code: 'C-01', name: 'Aisle C Row 1', sortOrder: 5 },
  ];

  for (const loc of sampleLocations) {
    await db.insert(locations).values(loc).onConflictDoNothing();
  }

  console.log('Created 5 sample locations');

  // Create default settings
  await db.insert(settings).values({
    id: nanoid(),
    key: 'invoice_next_number',
    value: '1001',
  }).onConflictDoNothing();

  await db.insert(settings).values({
    id: nanoid(),
    key: 'terms_options',
    value: JSON.stringify(['COD', 'Net 14', 'Net 30']),
  }).onConflictDoNothing();

  console.log('Created default settings');
  console.log('Seed complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
