// ADD DROPDOWN
import { PrismaClient } from "@prisma/client";

interface CustomNodeJsGlobal {
  prisma: PrismaClient;
}

// Feature 6

// CREATE MODAL
declare const global: CustomNodeJsGlobal;

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
