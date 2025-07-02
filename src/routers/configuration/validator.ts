import { z } from "zod";

export const createConfigurationSchema = z.object({
  serverName: z.string(),
  serviceName: z.string(),
  targetIP: z.string().ip(),
  tls: z.boolean(),
});
