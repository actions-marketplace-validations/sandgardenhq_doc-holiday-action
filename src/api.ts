// src/api.ts
import * as core from '@actions/core';
import { DocHolidayRequest, DocHolidayResponse } from './types';

const API_BASE_URL = 'https://api.doc.holiday';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Create a doc.holiday job
 */
export async function createJob(
  apiToken: string,
  request: DocHolidayRequest
): Promise<DocHolidayResponse> {
  const url = `${API_BASE_URL}/api/v1/jobs`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      core.info(`Attempting to create job (attempt ${attempt}/${MAX_RETRIES})...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // Handle specific status codes
      if (response.status === 401) {
        throw new Error(
          'Authentication failed. Please check your api-token. Ensure it is stored in GitHub secrets and passed correctly.'
        );
      }

      if (response.status === 429) {
        // Rate limited - retry with exponential backoff
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        core.warning(`Rate limited (429). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Doc.holiday API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json() as DocHolidayResponse;
      core.info(`Job created successfully: ${data.id}`);
      return data;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors
      if (lastError.message.includes('Authentication failed')) {
        throw lastError;
      }

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        core.warning(`Request failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed to create job after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Construct job URL for doc.holiday UI
 */
export function constructJobUrl(jobId: string): string {
  return `https://app.doc.holiday/jobs/${jobId}`;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
