import type { AppEnvironment } from '../../types';

export interface AppBuildMetadata {
  version: string;
  environment: AppEnvironment;
}

const fallbackEnvironment: AppEnvironment = import.meta.env.DEV ? 'development' : 'production';

export const appBuildMetadata: AppBuildMetadata =
  typeof __APP_METADATA__ !== 'undefined'
    ? __APP_METADATA__
    : {
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
        environment: fallbackEnvironment,
      };

export function getEnvironmentLabel(environment: AppEnvironment): string {
  switch (environment) {
    case 'preview':
      return 'Preview';
    case 'production':
      return 'Production';
    default:
      return 'Development';
  }
}

export function formatVersionLabel(metadata: AppBuildMetadata = appBuildMetadata): string {
  return `v${metadata.version} · ${getEnvironmentLabel(metadata.environment)}`;
}
