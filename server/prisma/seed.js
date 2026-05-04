import prisma from '../src/prisma.js';

await prisma.participant.upsert({
  where: { email: 'john.doe@example.com' },
  update: {},
  create: {
    email: 'john.doe@example.com',
    employeeId: 'EMP-002',
    firstName: 'John',
    lastName: 'Doe',
    role: 'Engineer',
    site: 'Manila',
  },
});

await prisma.participant.upsert({
  where: { email: 'john.doe12@example.com' },
  update: {},
  create: {
    email: 'john.doe12@example.com',
    employeeId: 'EMP-005',
    firstName: 'John',
    lastName: 'Doe',
    role: 'Engineer',
    site: 'Manila',
  },
});
console.log('Seeded 2 participants.');
await prisma.$disconnect();
