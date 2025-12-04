// src/github-context.ts
import * as github from '@actions/github';
import { SmartDefaults } from './types';

/**
 * Generate smart defaults based on GitHub event context
 */
export function getSmartDefaults(eventType: 'release' | 'merge'): SmartDefaults {
  const context = github.context;

  if (eventType === 'release') {
    return getReleaseDefaults(context);
  } else if (eventType === 'merge') {
    return getMergeDefaults(context);
  }

  throw new Error(`Unsupported event type: ${eventType}`);
}

/**
 * Extract defaults from release event
 */
function getReleaseDefaults(context: typeof github.context): SmartDefaults {
  const release = context.payload.release;

  if (!release) {
    throw new Error('No release data found in event payload. Is this a release event?');
  }

  const tagName = release.tag_name;
  const body = release.body || '';

  return {
    title: `Release notes for ${tagName}`,
    body,
    eventType: 'release',
  };
}

/**
 * Extract defaults from PR merge event
 */
function getMergeDefaults(context: typeof github.context): SmartDefaults {
  const pr = context.payload.pull_request;

  if (!pr) {
    throw new Error('No pull request data found in event payload. Is this a PR event?');
  }

  if (!pr.merged) {
    throw new Error('Pull request is not merged. Use event-type: merge only for merged PRs.');
  }

  const prNumber = pr.number;
  const prTitle = pr.title;
  const body = pr.body || '';

  return {
    title: `Documentation for PR #${prNumber}: ${prTitle}`,
    body,
    eventType: 'merge',
  };
}

/**
 * Infer source connection from current repository
 */
export function inferSourceConnection(): string {
  const context = github.context;
  return `${context.repo.owner}/${context.repo.repo}`;
}
