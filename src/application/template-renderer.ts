export interface TemplateValues {
  bump: string;
  currentVersion: string;
  nextVersion: string;
}

export interface TemplateRenderService {
  render(template: string, values: TemplateValues): string;
}
