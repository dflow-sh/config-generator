import { z } from 'zod'

export const createConfigurationSchema = z.object({
  username: z.string().min(1),
  serverName: z.string().min(1),
  serviceName: z.string().min(1),
  targetIP: z.string().ip(),
  tls: z.boolean(),
  domains: z.array(z.string()).optional(),
})

export const deleteConfigurationSchema = z.object({
  username: z.string().min(1),
  serverName: z.string().min(1),
  serviceName: z.string().min(1),
})
