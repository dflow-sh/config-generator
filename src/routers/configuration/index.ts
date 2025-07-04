import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import {
  createConfigurationSchema,
  deleteConfigurationSchema,
} from "./validator.js";
import { env } from "../../../env.js";

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { unlinkSync } from "fs";

export const configuration = new Hono();

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

configuration.post(zValidator("json", createConfigurationSchema), async (c) => {
  const { serverName, serviceName, tls, targetIP, username } =
    c.req.valid("json");
  const dir = process.env?.NODE_ENV === "production" ? "/app/output" : dirname;

  try {
    const localPath = path.resolve(
      `${dir}/${username}/${serverName}`,
      `${serviceName}.yaml`
    );

    console.log({ serverName, serviceName, targetIP, localPath });

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
                  url: tls ? `https://${targetIP}:80` : `http://${targetIP}:80`,
                },
              ],
            },
          },
        },
      },
    };

    const yamlData = yaml.dump(traefikSchema);

    mkdirSync(path.dirname(localPath), { recursive: true });

    writeFileSync(localPath, yamlData, "utf8");

    // This reloads the traefik configuration
    writeFileSync(
      `${dir}/.logs`,
      `\n# ${new Date().toISOString()} Created ${username}/${serverName}/${serviceName}.yaml`,
      {
        flag: "a",
      }
    );

    return c.json(
      {
        message: `Successfully created configuration file ${username}/${serverName}/${serviceName}.yaml`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return c.json(
      {
        message: `Failed to create configuration file ${username}/${serverName}/${serviceName}.yaml`,
        error,
      },
      {
        status: 500,
      }
    );
  }
});

configuration.delete(
  zValidator("json", deleteConfigurationSchema),
  async (c) => {
    const { serverName, serviceName, username } = c.req.valid("json");

    try {
      const localPath = path.resolve(
        `${
          process.env?.NODE_ENV === "production" ? "/app/output" : dirname
        }/${username}/${serverName}`,
        `${serviceName}.yaml`
      );

      // Delete the file at localPath
      unlinkSync(localPath);

      return c.json(
        {
          message: `Successfully deleted configuration file ${username}/${serverName}/${serviceName}.yaml`,
        },
        {
          status: 200,
        }
      );
    } catch (error) {
      return c.json(
        {
          message: `Failed to delete configuration file ${username}/${serverName}/${serviceName}.yaml`,
          error,
        },
        {
          status: 500,
        }
      );
    }
  }
);

configuration.post("/default", async (c) => {
  const defaultJSON = {
    http: {
      routers: {
        "dflow-traefik-router": {
          rule: "Host(`" + `dflow-traefik.${env.WILD_CARD_DOMAIN}` + ")",
          entryPoints: ["websecure"],
          tls: {
            certResolver: "letsencrypt",
          },
          service: "dflow-traefik-service",
        },
      },
      services: {
        "dflow-traefik-service": {
          loadBalancer: {
            servers: [
              {
                url: "http://127.0.0.1:3000",
              },
            ],
          },
        },
      },
    },
  };

  try {
    const localPath = path.resolve(
      `${
        process.env?.NODE_ENV === "production" ? "/app/output" : dirname
      }/dflow-traefik.yaml`
    );

    const yamlData = yaml.dump(defaultJSON);

    mkdirSync(path.dirname(localPath), { recursive: true });

    writeFileSync(localPath, yamlData, "utf8");

    return c.json(
      {
        message: `Successfully created default configuration file dflow-traefik.yaml`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return c.json(
      {
        message: `Failed to create default configuration file dflow-traefik.yaml`,
        error,
      },
      {
        status: 500,
      }
    );
  }
});
