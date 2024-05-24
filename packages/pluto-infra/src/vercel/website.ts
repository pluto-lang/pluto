import * as path from "path";
import * as fs from "fs-extra";
import * as pulumi from "@pulumi/pulumi";
import * as vercel from "@pulumiverse/vercel";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { Website as WebsiteProto, WebsiteOptions } from "@plutolang/pluto";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

export class Website extends pulumi.ComponentResource implements IResourceInfra {
  public readonly id: string;

  private readonly envs: { [key: string]: pulumi.Output<string> | string } = {};
  private readonly websiteDir: string;

  private readonly vercelProvider: vercel.Provider;
  private readonly vercelProject: vercel.Project;

  private websiteEndpoint: pulumi.Output<string>;

  // eslint-disable-next-line
  public outputs?: pulumi.Output<any>;

  constructor(websiteRoot: string, name?: string, options?: WebsiteOptions) {
    name = name ?? "default";
    super("pluto:website:vercel/Website", name, options);
    this.id = genResourceId(WebsiteProto.fqn, name);

    const projectRoot = new pulumi.Config("pluto").require("projectRoot");
    this.websiteDir = path.resolve(projectRoot, websiteRoot);
    if (!fs.existsSync(this.websiteDir)) {
      throw new Error(`The path ${this.websiteDir} does not exist.`);
    }

    if (!VERCEL_API_TOKEN || !VERCEL_TEAM_ID) {
      throw new Error("VERCEL_API_TOKEN and VERCEL_TEAM_ID must be set.");
    }

    this.vercelProvider = new vercel.Provider(formatName(this.id), {
      apiToken: VERCEL_API_TOKEN,
      team: VERCEL_TEAM_ID,
    });

    this.vercelProject = new vercel.Project(
      formatName(this.id),
      {
        name: formatName(this.id),
        teamId: VERCEL_TEAM_ID,
      },
      {
        parent: this,
        provider: this.vercelProvider,
      }
    );

    this.websiteEndpoint = pulumi.interpolate`https://${formatName(this.id)}.vercel.app`;
    this.outputs = this.websiteEndpoint;
  }

  public addEnv(key: string, value: pulumi.Output<string> | string) {
    this.envs[key] = value;
  }

  public url(): string {
    return this.websiteEndpoint as any;
  }

  public grantPermission(op: string, resource?: IResourceInfra) {
    op;
    resource;
    throw new Error("Method should be called.");
  }

  public postProcess(): void {
    function dumpPlutoJs(filepath: string, envs: { [key: string]: string }) {
      const content = PLUTO_JS_TEMPALETE.replace("{placeholder}", JSON.stringify(envs, null, 2));
      fs.writeFileSync(filepath, content);
    }

    function cleanUpPlutoJs(filepath: string, originalPlutoJs?: string) {
      // Remove the generated `pluto.js` file after deployment.
      fs.removeSync(filepath);
      // Restore original pluto.js content.
      if (originalPlutoJs) {
        fs.writeFileSync(filepath, originalPlutoJs);
      }
    }

    pulumi.output(this.envs).apply(async (envs) => {
      const filepath = path.join(this.websiteDir, "pluto.js");
      // Developers may have previously constructed a `pluto.js` file to facilitate debugging
      // throughout the development process. Therefore, it's essential to back up the original
      // content of `pluto.js` and ensure it's restored after deployment.
      const originalPlutoJs = fs.existsSync(filepath)
        ? fs.readFileSync(filepath, "utf8")
        : undefined;

      let deployment: vercel.Deployment | undefined;
      try {
        dumpPlutoJs(filepath, envs);

        deployment = new vercel.Deployment(
          formatName(this.id),
          {
            projectId: this.vercelProject.id,
            pathPrefix: this.websiteDir,
            files: (await vercel.getProjectDirectory({ path: this.websiteDir })).files,
            production: true,
            teamId: VERCEL_TEAM_ID,
          },
          {
            parent: this,
            provider: this.vercelProvider,
          }
        );
      } finally {
        // Clean up the generated `pluto.js` file after deployment.
        if (!deployment) {
          cleanUpPlutoJs(filepath, originalPlutoJs);
        } else {
          deployment.id.apply(async () => {
            cleanUpPlutoJs(filepath, originalPlutoJs);
          });
        }
      }
    });
  }
}

const PLUTO_JS_TEMPALETE = `
window.plutoEnv = {placeholder}
`;

function formatName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^-a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 95);
}
