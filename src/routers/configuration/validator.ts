import { z } from "zod";

export const createConfigurationSchema = z.object({
  username: z.string().min(1),
  serverName: z.string().min(1),
  serviceName: z.string().min(1),
  targetIP: z.string().ip(),
  tls: z.boolean(),
});
