// src/inputs.ts
import * as core from '@actions/core';
import { ActionInputs, ChangesetInput } from './types';

/**
 * Parse and validate all action inputs
 */
export function parseInputs(): ActionInputs {
  const apiToken = core.getInput('api-token', { required: true });
  const eventTypeRaw = core.getInput('event-type');
  const eventType = (eventTypeRaw || undefined) as 'release' | 'merge' | 'custom' | undefined;

  // Manual mode inputs
  const title = core.getInput('title');
  const body = core.getInput('body');
  const publicationsInput = core.getInput('publications');
  const sourceConnection = core.getInput('source-connection');
  const labelsInput = core.getInput('labels');
  const commentsInput = core.getInput('comments');
  const relevantLinksInput = core.getInput('relevant-links');

  // Parse comma-separated inputs
  const publications = publicationsInput
    ? publicationsInput.split(',').map(p => p.trim()).filter(Boolean)
    : undefined;

  const labels = labelsInput
    ? labelsInput.split(',').map(l => l.trim()).filter(Boolean)
    : undefined;

  const comments = commentsInput
    ? commentsInput.split('\n').map(c => c.trim()).filter(Boolean)
    : undefined;

  const relevantLinks = relevantLinksInput
    ? relevantLinksInput.split(',').map(l => l.trim()).filter(Boolean)
    : undefined;

  // Parse changeset inputs
  const changeset = parseChangesetInputs();

  // Validate manual mode requirements
  if (!eventType || eventType === 'custom') {
    if (!title) {
      throw new Error('title is required when event-type is not set or is "custom"');
    }
    if (!body) {
      throw new Error('body is required when event-type is not set or is "custom"');
    }
  }

  return {
    apiToken,
    eventType,
    title: title || undefined,
    body: body || undefined,
    publications,
    sourceConnection: sourceConnection || undefined,
    labels,
    comments,
    relevantLinks,
    changeset,
  };
}

/**
 * Parse changeset specification inputs
 */
function parseChangesetInputs(): ChangesetInput | undefined {
  const releasesCount = core.getInput('releases-count');
  const timeRangeStart = core.getInput('time-range-start');
  const timeRangeEnd = core.getInput('time-range-end');
  const commitsCount = core.getInput('commits-count');
  const commitsSinceSha = core.getInput('commits-since-sha');
  const commitsShas = core.getInput('commits-shas');
  const commitsStartSha = core.getInput('commits-start-sha');
  const commitsEndSha = core.getInput('commits-end-sha');
  const commitsIncludeStart = core.getInput('commits-include-start');
  const tagsStart = core.getInput('tags-start');
  const tagsEnd = core.getInput('tags-end');

  // Check if any changeset inputs are provided
  const hasAnyChangesetInput = [
    releasesCount,
    timeRangeStart,
    commitsCount,
    commitsSinceSha,
    commitsShas,
    commitsStartSha,
    tagsStart,
  ].some(Boolean);

  if (!hasAnyChangesetInput) {
    return undefined;
  }

  // Validate mutual exclusivity
  const specifiedTypes = [
    releasesCount && 'releases-count',
    timeRangeStart && 'time-range',
    commitsCount && 'commits-count',
    commitsSinceSha && 'commits-since-sha',
    commitsShas && 'commits-shas',
    commitsStartSha && 'commits-range',
    tagsStart && 'tags',
  ].filter(Boolean);

  if (specifiedTypes.length > 1) {
    throw new Error(
      `Multiple changeset types specified: ${specifiedTypes.join(', ')}. Only one type is allowed.`
    );
  }

  return {
    releasesCount: releasesCount ? parseInt(releasesCount, 10) : undefined,
    timeRangeStart: timeRangeStart || undefined,
    timeRangeEnd: timeRangeEnd || undefined,
    commitsCount: commitsCount ? parseInt(commitsCount, 10) : undefined,
    commitsSinceSha: commitsSinceSha || undefined,
    commitsShas: commitsShas
      ? commitsShas.split(',').map(s => s.trim()).filter(Boolean)
      : undefined,
    commitsStartSha: commitsStartSha || undefined,
    commitsEndSha: commitsEndSha || undefined,
    commitsIncludeStart: commitsIncludeStart ? commitsIncludeStart === 'true' : undefined,
    tagsStart: tagsStart || undefined,
    tagsEnd: tagsEnd || undefined,
  };
}
