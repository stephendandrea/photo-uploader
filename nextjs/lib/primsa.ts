// ADD DROPDOWN
import { PrismaClient } from "@prisma/client";

interface CustomNodeJsGlobal {
  prisma: PrismaClient;
}

// Feature 1
// Feature 2
// Feature 3
// Feature 4

// CREATE MODAL
declare const global: CustomNodeJsGlobal;

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
