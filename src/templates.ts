import type { TemplateRenderService, TemplateValues } from './application/template-renderer';

export class TemplateRenderer implements TemplateRenderService {
  render(template: string, values: TemplateValues): string {
    return template
      .replaceAll('{version}', values.nextVersion)
      .replaceAll('{next-version}', values.nextVersion)
      .replaceAll('{current-version}', values.currentVersion)
      .replaceAll('{bump}', values.bump);
  }
}
