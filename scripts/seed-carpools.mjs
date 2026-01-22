import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

async function main() {
  await prisma.carpoolMessage.deleteMany();
  await prisma.carpoolParticipant.deleteMany();
  await prisma.carpool.deleteMany();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const carpool1 = await prisma.carpool.create({
    data: {
      creatorId: "user_creator1",
      destination: "Boston Airport",
      date: formatDate(tomorrow),
      timeStart: "16:30",
      timeEnd: "17:30",
      pickupArea: "Campus Center",
      seatsNeeded: 2,
      targetGroupSize: 3,
      status: "OPEN",
      notes: "Looking for 2 more people to split the ride cost!",
      participants: {
        create: {
          userId: "user_creator1",
          confirmedAt: now,
          isCreator: true
        }
      }
    }
  });

  const carpool2 = await prisma.carpool.create({
    data: {
      creatorId: "user_creator2",
      destination: "New York City",
      date: formatDate(dayAfter),
      timeStart: "08:00",
      timeEnd: "09:00",
      pickupArea: "Ford Hall",
      seatsNeeded: 3,
      targetGroupSize: 4,
      status: "OPEN",
      participants: {
        create: {
          userId: "user_creator2",
          confirmedAt: now,
          isCreator: true
        }
      }
    }
  });

  await prisma.carpoolMessage.create({
    data: {
      carpoolId: carpool1.id,
      userId: "user_creator1",
      content: "Hey! Looking for 2 more people to share the ride to Boston Airport on Friday."
    }
  });

  console.log(`Seeded carpools: ${carpool1.id}, ${carpool2.id}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed carpools:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
