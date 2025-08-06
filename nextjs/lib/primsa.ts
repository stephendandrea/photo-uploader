import { PrismaClient } from "@prisma/client";

interface CustomNodeJsGlobal {
  prisma: PrismaClient;
}

// comment
declare const global: CustomNodeJsGlobal;

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
