export const AUTH_TOKEN_SENTINEL: string;

export interface MonitoringPluginOptions {
  org: string;
  project: string;
  authToken: string;
  telemetry: false;
  silent: true;
  debug: false;
  release: {
    name: string;
    inject: true;
    create: true;
    finalize: true;
    setCommits: false;
    deploy: false;
  };
  sourcemaps: { assets: string[]; filesToDeleteAfterUpload: string[] };
  errorHandler: () => never;
}

export function createMonitoringBuild<TPlugin>(options: {
  env?: Record<string, string | undefined>;
  command: "build" | "serve";
  branch?: string;
  preview?: boolean;
  expectedProject: string;
  sentryPlugin: (options: MonitoringPluginOptions) => TPlugin | TPlugin[];
  readCommit?: () => string;
}): {
  define: Record<string, string>;
  build: { sourcemap: false | "hidden" };
  plugins: TPlugin[];
};

export function assertPrivateArtifacts(directory: string, options?: { authToken?: string }): Promise<void>;
