// __tests__/smart-mode-changes.test.ts
import * as core from '@actions/core';
import { ActionInputs, SmartDefaults, DocHolidayResponse } from '../src/types';

// Mock all modules BEFORE importing them
jest.mock('@actions/core');
jest.mock('../src/inputs');
jest.mock('../src/github-context');
jest.mock('../src/changes');
jest.mock('../src/api');

// Import after mocking
import { parseInputs } from '../src/inputs';
import { getSmartDefaults, inferSourceConnection } from '../src/github-context';
import { buildChanges } from '../src/changes';
import { createJob, constructJobUrl } from '../src/api';
import { run } from '../src/index';

// Create typed mocks
const mockCore = core as jest.Mocked<typeof core>;
const mockParseInputs = parseInputs as jest.MockedFunction<typeof parseInputs>;
const mockGetSmartDefaults = getSmartDefaults as jest.MockedFunction<typeof getSmartDefaults>;
const mockInferSourceConnection = inferSourceConnection as jest.MockedFunction<typeof inferSourceConnection>;
const mockBuildChanges = buildChanges as jest.MockedFunction<typeof buildChanges>;
const mockCreateJob = createJob as jest.MockedFunction<typeof createJob>;
const mockConstructJobUrl = constructJobUrl as jest.MockedFunction<typeof constructJobUrl>;

describe('Smart Mode Changes Bug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('release mode should provide changes array to API', async () => {
    // Arrange
    const mockInputs: ActionInputs = {
      apiToken: 'test-token',
      eventType: 'release',
    };

    // getSmartDefaults SHOULD return changes for releases
    const mockSmartDefaults: SmartDefaults = {
      title: 'Release notes for v1.0.0',
      body: 'Release body content',
      eventType: 'release',
      changes: [{ releases: { count: 1 } }], // Should be populated by getSmartDefaults
    };

    const mockResponse: DocHolidayResponse = {
      id: 'job-123',
      orgId: 'org-456',
      type: 'doc',
      state: 'requested',
    };

    mockParseInputs.mockReturnValue(mockInputs);
    mockGetSmartDefaults.mockReturnValue(mockSmartDefaults);
    mockInferSourceConnection.mockReturnValue('owner/repo');
    mockCreateJob.mockResolvedValue(mockResponse);
    mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-123');

    // Act
    await run();

    // Assert - Expect changes to be included in the API request
    const createJobCall = mockCreateJob.mock.calls[0];
    expect(createJobCall).toBeDefined();

    const apiRequest = createJobCall[1];

    // This SHOULD be included - test will FAIL until we fix the implementation
    expect(apiRequest.docRequest.changes).toEqual([{ releases: { count: 1 } }]);
  });

  it('merge mode should provide changes array with PR commit range to API', async () => {
    // Arrange
    const mockInputs: ActionInputs = {
      apiToken: 'test-token',
      eventType: 'merge',
    };

    // getSmartDefaults SHOULD return changes for PR merges
    const mockSmartDefaults: SmartDefaults = {
      title: 'Documentation for PR #42',
      body: 'PR description',
      eventType: 'merge',
      changes: [{ commits: { startSha: 'abc123', endSha: 'def456', includeStartCommit: true } }], // Should be populated by getSmartDefaults
    };

    const mockResponse: DocHolidayResponse = {
      id: 'job-789',
      orgId: 'org-456',
      type: 'doc',
      state: 'requested',
    };

    mockParseInputs.mockReturnValue(mockInputs);
    mockGetSmartDefaults.mockReturnValue(mockSmartDefaults);
    mockInferSourceConnection.mockReturnValue('owner/repo');
    mockCreateJob.mockResolvedValue(mockResponse);
    mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-789');

    // Act
    await run();

    // Assert - Expect changes to be included in the API request
    const createJobCall = mockCreateJob.mock.calls[0];
    expect(createJobCall).toBeDefined();

    const apiRequest = createJobCall[1];

    // This SHOULD be included - test will FAIL until we fix the implementation
    expect(apiRequest.docRequest.changes).toEqual([
      { commits: { startSha: 'abc123', endSha: 'def456', includeStartCommit: true } }
    ]);
  });
});
