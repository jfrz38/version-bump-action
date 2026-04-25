import path from 'node:path';

export function toGitPath(cwd: string, filePath: string): string {
  const relativePath = path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
  return relativePath.split(path.sep).join('/');
}

export function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}
