// Chạy việc định kỳ một lần (tự hủy đơn chờ quá hạn, nhắc giờ đá): npm run jobs
import { runScheduledJobs } from "../src/lib/server/jobs";
import { db } from "../src/lib/server/db";

runScheduledJobs()
  .then((r) => console.log("✔ Việc định kỳ:", r))
  .finally(() => db.$disconnect());
