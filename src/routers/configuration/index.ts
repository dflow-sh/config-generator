import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createConfigurationSchema } from "./validator.js";
import { env } from "../../../env.js";

import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

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
    const { serverName, serviceName, tls, targetIP, username } =
      c.req.valid("json");

    console.log({ serverName, serviceName, targetIP });

    try {
      const localPath = path.resolve(
        `${
          process.env?.NODE_ENV === "production" ? "/app/output" : dirname
        }/${username}/${serverName}`,
        `${serviceName}.yaml`
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

      const yamlData = yaml.dump(traefikSchema);

      mkdirSync(path.dirname(localPath), { recursive: true });

      writeFileSync(localPath, yamlData, "utf8");

      // Cleanup the temp file
      // unlinkSync(localPath);
    } catch (error) {
      console.log({ error });
    }

    return c.text(`Create configuration`);
  }
);
