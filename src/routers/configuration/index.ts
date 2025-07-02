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
    // const ssh = new NodeSSH();
    const { serverName, serviceName, enableLetsencrypt, targetIP } =
      c.req.valid("json");

    console.log({ serverName, serviceName, enableLetsencrypt, targetIP });

    try {
      // await ssh.connect({
      //   host: env.HOSTNAME,
      //   username: env.USERNAME,
      // });

      const localPath = path.resolve(
        dirname,
        `temp.${new Date().getTime()}.json`
      );
      const remotePath = `/remote/${serverName}/${serviceName}.json`;

      console.log({ localPath });

      const traefikSchema = {
        http: {
          routers: {
            [`{${serviceName}}-{${serverName}}-router`]: {
              rule:
                "Host(`" +
                `{${serviceName}}.{${serverName}}.${env.WILD_CARD_DOMAIN}` +
                "`)",
              entryPoints: ["websecure"],
              tls: {
                certResolver: "letsencrypt",
              },
              service: `{${serviceName}}-{${serverName}}-service`,
            },
          },
          services: {
            [`{${serviceName}}-{${serverName}}-service`]: {
              loadBalancer: {
                servers: [
                  {
                    url: `http://${targetIP}`,
                  },
                ],
              },
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
