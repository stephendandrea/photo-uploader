import { PrismaClient } from "@prisma/client";

interface CustomNodeJsGlobal {
  prisma: PrismaClient;
}

declare const global: CustomNodeJsGlobal;

// abother comment
const prisma = new PrismaClient();

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
