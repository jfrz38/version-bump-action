import * as core from '@actions/core';
import { executeVersionBumpPr, type ActionOutputs } from './application/version-bump-pr-use-case';
import { ActionConfig } from './domain/action-config';
import { readInputs } from './inputs';

export async function run(): Promise<ActionOutputs> {
  const outputs = await executeVersionBumpPr(new ActionConfig(readInputs()), process.cwd());
  setOutputs(outputs);
  return outputs;
}

function setOutputs(outputs: ActionOutputs): void {
  core.setOutput('current-version', outputs.currentVersion);
  core.setOutput('next-version', outputs.nextVersion);
  core.setOutput('tag', outputs.tag);
  core.setOutput('branch', outputs.branch);
  core.setOutput('pr-url', outputs.prUrl);
  core.setOutput('changed-files', outputs.changedFiles);
}

if (require.main === module) {
  run().catch((error) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
