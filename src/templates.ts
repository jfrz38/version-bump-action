export interface TemplateValues {
  bump: string;
  currentVersion: string;
  nextVersion: string;
}

export function renderTemplate(template: string, values: TemplateValues): string {
  return template
    .replaceAll('{version}', values.nextVersion)
    .replaceAll('{next-version}', values.nextVersion)
    .replaceAll('{current-version}', values.currentVersion)
    .replaceAll('{bump}', values.bump);
}
