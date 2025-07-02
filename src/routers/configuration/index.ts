import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { NodeSSH } from "node-ssh";

import { createConfigurationSchema } from "./validator.js";
import { env } from "../../../env.js";

import { writeFileSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const configuration = new Hono();

// {
//     "http": {
//       "routers": {
//         "{serviceName}-{serverName}-router": {
//           "rule": "Host(`{serviceName}.{serverName}.up.dflow.sh`)",
//           "entryPoints": [
//             "websecure"
//           ],
//           "tls": {
//             "certResolver": "letsencrypt"
//           },
//           "service": "{serviceName}-{serverName}-service"
//         }
//       },
//       "services": {
//         "{serviceName}-{serverName}-service": {
//           "loadBalancer": {
//             "servers": [
//               {
//                 "url": "http://100.122.90.48:80"
//               }
//             ]
//           }
//         }
//       }
//     }
//   }

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

configuration.post(
  "/create",
  zValidator("json", createConfigurationSchema),
  async (c) => {
    const { serverName, serviceName, tls, targetIP } = c.req.valid("json");

    console.log({ serverName, serviceName, targetIP });

    try {
      const localPath = path.resolve(
        `${dirname}/${serverName}`,
        `${serviceName}.json`
      );

      console.log({ localPath });

      const traefikSchema = {
        http: {
          routers: {
            [`${serviceName}-${serverName}-router`]: {
              rule:
                "Host(`" +
                `${serviceName}.${serverName}.${env.WILD_CARD_DOMAIN}` +
                "`)",
              entryPoints: ["websecure"],
              tls: tls
                ? tls
                : {
                    certResolver: "letsencrypt",
                  },
              service: `${serviceName}-${serverName}-service`,
            },
          },
          services: {
            [`${serviceName}-${serverName}-service`]: {
              loadBalancer: {
                servers: [
                  {
                    url: tls
                      ? `https://${targetIP}:80`
                      : `http://${targetIP}:80`,
                  },
                ],
              },
              passHostHeader: true,
            },
          },
        },
      };

      writeFileSync(localPath, JSON.stringify(traefikSchema, null, 2));

      // Upload the file
      // await ssh.putFile(localPath, remotePath);

      // Cleanup the temp file
      // unlinkSync(localPath);
    } catch (error) {
      console.log({ error });
    }

    return c.text(`Create configuration ${env.HOSTNAME}`);
  }
);
