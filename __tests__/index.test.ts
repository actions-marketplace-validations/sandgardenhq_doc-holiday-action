// __tests__/index.test.ts
import * as core from '@actions/core';
import { parseInputs } from '../src/inputs';
import { getSmartDefaults, inferSourceConnection } from '../src/github-context';
import { buildChanges } from '../src/changes';
import { createJob, constructJobUrl } from '../src/api';
import { ActionInputs, SmartDefaults, DocHolidayRequest, DocHolidayResponse } from '../src/types';

// Mock all modules
jest.mock('@actions/core');
jest.mock('../src/inputs');
jest.mock('../src/github-context');
jest.mock('../src/changes');
jest.mock('../src/api');

// Create typed mocks
const mockCore = core as jest.Mocked<typeof core>;
const mockParseInputs = parseInputs as jest.MockedFunction<typeof parseInputs>;
const mockGetSmartDefaults = getSmartDefaults as jest.MockedFunction<typeof getSmartDefaults>;
const mockInferSourceConnection = inferSourceConnection as jest.MockedFunction<typeof inferSourceConnection>;
const mockBuildChanges = buildChanges as jest.MockedFunction<typeof buildChanges>;
const mockCreateJob = createJob as jest.MockedFunction<typeof createJob>;
const mockConstructJobUrl = constructJobUrl as jest.MockedFunction<typeof constructJobUrl>;

// Import run function dynamically to ensure mocks are set up first
let run: () => Promise<void>;

describe('index.ts - main orchestration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset module registry to get fresh instance
    jest.resetModules();

    // Re-setup mocks
    jest.mock('@actions/core');
    jest.mock('../src/inputs');
    jest.mock('../src/github-context');
    jest.mock('../src/changes');
    jest.mock('../src/api');

    // Import the run function
    const indexModule = await import('../src/index');
    // The module exports the run function via direct execution, so we need to get it
    // For testing purposes, we'll need to structure our index.ts to export the run function
  });

  describe('Smart Mode: Release', () => {
    it('should complete full flow for release mode', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
      };

      const mockSmartDefaults: SmartDefaults = {
        title: 'Release notes for v1.0.0',
        body: 'Release body content',
        eventType: 'release',
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
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith('Starting doc.holiday GitHub Action...');
      expect(mockParseInputs).toHaveBeenCalledTimes(1);
      expect(mockGetSmartDefaults).toHaveBeenCalledWith('release');
      expect(mockInferSourceConnection).toHaveBeenCalledTimes(1);

      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Release notes for v1.0.0',
          body: 'Release body content',
          sourceConnection: 'owner/repo',
          eventType: 'release',
        },
      });

      expect(mockCore.setOutput).toHaveBeenCalledWith('job-id', 'job-123');
      expect(mockCore.setOutput).toHaveBeenCalledWith('job-state', 'requested');
      expect(mockCore.setOutput).toHaveBeenCalledWith('job-url', 'https://app.doc.holiday/jobs/job-123');

      expect(mockCore.info).toHaveBeenCalledWith('✓ Action completed successfully!');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should handle release mode with changeset inputs', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
        changeset: {
          releasesCount: 2,
        },
      };

      const mockSmartDefaults: SmartDefaults = {
        title: 'Release notes for v1.0.0',
        body: 'Release body content',
        eventType: 'release',
      };

      const mockChanges = [{ releases: { count: 2 } }];

      const mockResponse: DocHolidayResponse = {
        id: 'job-456',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockGetSmartDefaults.mockReturnValue(mockSmartDefaults);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockBuildChanges.mockReturnValue(mockChanges);
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-456');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockBuildChanges).toHaveBeenCalledWith({ releasesCount: 2 });
      expect(mockCore.info).toHaveBeenCalledWith('Changeset specification added to request');
      expect(mockCore.warning).toHaveBeenCalledWith('Changeset inputs override any commits specified in body');

      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Release notes for v1.0.0',
          body: 'Release body content',
          sourceConnection: 'owner/repo',
          eventType: 'release',
          changes: mockChanges,
        },
      });
    });
  });

  describe('Smart Mode: Merge', () => {
    it('should complete full flow for merge mode', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'merge',
      };

      const mockSmartDefaults: SmartDefaults = {
        title: 'Documentation for PR #123: Add new feature',
        body: 'PR body content',
        eventType: 'merge',
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
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith('Smart mode: merge');
      expect(mockGetSmartDefaults).toHaveBeenCalledWith('merge');

      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Documentation for PR #123: Add new feature',
          body: 'PR body content',
          sourceConnection: 'owner/repo',
          eventType: 'merge',
        },
      });

      expect(mockCore.setOutput).toHaveBeenCalledWith('job-id', 'job-789');
    });
  });

  describe('Manual/Custom Mode', () => {
    it('should complete full flow for custom mode', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'custom',
        title: 'Manual documentation request',
        body: 'Generate docs for last 10 commits',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-custom-123',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-custom-123');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockGetSmartDefaults).not.toHaveBeenCalled();
      expect(mockInferSourceConnection).toHaveBeenCalledTimes(1);

      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Manual documentation request',
          body: 'Generate docs for last 10 commits',
          sourceConnection: 'owner/repo',
        },
      });

      expect(mockCore.setOutput).toHaveBeenCalledWith('job-id', 'job-custom-123');
    });

    it('should work with undefined event-type (defaults to custom mode)', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Manual documentation request',
        body: 'Generate docs',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-undefined-123',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-undefined-123');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockGetSmartDefaults).not.toHaveBeenCalled();
      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Manual documentation request',
          body: 'Generate docs',
          sourceConnection: 'owner/repo',
        },
      });
    });
  });

  describe('Optional Fields', () => {
    it('should include all optional fields when provided', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'custom',
        title: 'Test with all options',
        body: 'Test body',
        publications: ['pub1', 'pub2'],
        sourceConnection: 'custom-org/custom-repo',
        labels: ['label1', 'label2'],
        comments: ['comment1', 'comment2'],
        relevantLinks: ['https://example.com', 'https://example.org'],
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-with-options',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo'); // Should not be used
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-with-options');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Test with all options',
          body: 'Test body',
          sourceConnection: 'custom-org/custom-repo',
          publications: ['pub1', 'pub2'],
          labels: ['label1', 'label2'],
          comments: ['comment1', 'comment2'],
          relevantLinks: ['https://example.com', 'https://example.org'],
        },
      });
    });

    it('should not include custom eventType in API request', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'custom',
        title: 'Test',
        body: 'Test body',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-no-event',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-no-event');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      const createJobCall = mockCreateJob.mock.calls[0];
      expect(createJobCall[1].docRequest).not.toHaveProperty('eventType');
    });

    it('should use provided sourceConnection instead of inferring', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'custom',
        title: 'Test',
        body: 'Test body',
        sourceConnection: 'my-custom-connection',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-custom-conn',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-custom-conn');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith('Source connection: my-custom-connection');
      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: expect.objectContaining({
          sourceConnection: 'my-custom-connection',
        }),
      });
    });
  });

  describe('Changeset Inputs', () => {
    it('should build and include changes when changeset provided', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
        changeset: {
          commitsCount: 5,
        },
      };

      const mockChanges = [{ commits: { count: 5 } }];

      const mockResponse: DocHolidayResponse = {
        id: 'job-changeset',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockBuildChanges.mockReturnValue(mockChanges);
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-changeset');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockBuildChanges).toHaveBeenCalledWith({ commitsCount: 5 });
      expect(mockCore.info).toHaveBeenCalledWith('Changeset specification added to request');
      expect(mockCore.warning).toHaveBeenCalledWith('Changeset inputs override any commits specified in body');

      expect(mockCreateJob).toHaveBeenCalledWith('test-token', {
        docRequest: {
          title: 'Test',
          body: 'Test body',
          sourceConnection: 'owner/repo',
          changes: mockChanges,
        },
      });
    });

    it('should not include changes when buildChanges returns empty array', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
        changeset: {
          commitsCount: 5,
        },
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-no-changes',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockBuildChanges.mockReturnValue([]); // Empty array
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-no-changes');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockBuildChanges).toHaveBeenCalled();
      expect(mockCore.info).not.toHaveBeenCalledWith('Changeset specification added to request');

      const createJobCall = mockCreateJob.mock.calls[0];
      expect(createJobCall[1].docRequest).not.toHaveProperty('changes');
    });

    it('should not call buildChanges when no changeset provided', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-no-changeset',
        orgId: 'org-456',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-no-changeset');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockBuildChanges).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call setFailed when parseInputs throws', async () => {
      // Arrange
      const error = new Error('Invalid inputs');
      mockParseInputs.mockImplementation(() => {
        throw error;
      });

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid inputs');
      expect(mockCreateJob).not.toHaveBeenCalled();
      expect(mockCore.setOutput).not.toHaveBeenCalled();
    });

    it('should call setFailed when getSmartDefaults throws', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
      };

      const error = new Error('No release data found');
      mockParseInputs.mockReturnValue(mockInputs);
      mockGetSmartDefaults.mockImplementation(() => {
        throw error;
      });

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('No release data found');
      expect(mockCreateJob).not.toHaveBeenCalled();
    });

    it('should call setFailed when createJob throws', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
      };

      const error = new Error('API request failed');
      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockRejectedValue(error);

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('API request failed');
      expect(mockCore.setOutput).not.toHaveBeenCalled();
    });

    it('should call setFailed with generic message for non-Error exceptions', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockRejectedValue('string error');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('An unknown error occurred');
    });

    it('should throw error when title is missing after smart defaults', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
      };

      // This should not happen in practice, but testing edge case
      const mockSmartDefaults: SmartDefaults = {
        title: '', // Empty title
        body: 'body',
        eventType: 'release',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockGetSmartDefaults.mockReturnValue(mockSmartDefaults);

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('Title and body are required');
    });

    it('should throw error when body is missing after smart defaults', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
      };

      // This should not happen in practice, but testing edge case
      const mockSmartDefaults: SmartDefaults = {
        title: 'title',
        body: '', // Empty body
        eventType: 'release',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockGetSmartDefaults.mockReturnValue(mockSmartDefaults);

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setFailed).toHaveBeenCalledWith('Title and body are required');
    });
  });

  describe('Output Setting', () => {
    it('should set all three outputs correctly', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-output-123',
        orgId: 'org-789',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-output-123');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.setOutput).toHaveBeenCalledWith('job-id', 'job-output-123');
      expect(mockCore.setOutput).toHaveBeenCalledWith('job-state', 'requested');
      expect(mockCore.setOutput).toHaveBeenCalledWith('job-url', 'https://app.doc.holiday/jobs/job-output-123');
      expect(mockCore.setOutput).toHaveBeenCalledTimes(3);
    });

    it('should log job information at the end', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        title: 'Test',
        body: 'Test body',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-log-123',
        orgId: 'org-789',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-log-123');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith('✓ Action completed successfully!');
      expect(mockCore.info).toHaveBeenCalledWith('Job ID: job-log-123');
      expect(mockCore.info).toHaveBeenCalledWith('Job State: requested');
      expect(mockCore.info).toHaveBeenCalledWith('View job: https://app.doc.holiday/jobs/job-log-123');
    });
  });

  describe('Logging', () => {
    it('should log progress throughout execution', async () => {
      // Arrange
      const mockInputs: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
      };

      const mockSmartDefaults: SmartDefaults = {
        title: 'Release notes for v1.0.0',
        body: 'Release body',
        eventType: 'release',
      };

      const mockResponse: DocHolidayResponse = {
        id: 'job-log-456',
        orgId: 'org-789',
        type: 'doc',
        state: 'requested',
      };

      mockParseInputs.mockReturnValue(mockInputs);
      mockGetSmartDefaults.mockReturnValue(mockSmartDefaults);
      mockInferSourceConnection.mockReturnValue('owner/repo');
      mockCreateJob.mockResolvedValue(mockResponse);
      mockConstructJobUrl.mockReturnValue('https://app.doc.holiday/jobs/job-log-456');

      // Act
      const { run } = await import('../src/index');
      await run();

      // Assert
      expect(mockCore.info).toHaveBeenCalledWith('Starting doc.holiday GitHub Action...');
      expect(mockCore.info).toHaveBeenCalledWith('Inputs parsed and validated successfully');
      expect(mockCore.info).toHaveBeenCalledWith('Smart mode: release');
      expect(mockCore.info).toHaveBeenCalledWith('Source connection: owner/repo');
      expect(mockCore.info).toHaveBeenCalledWith('API request constructed');
    });
  });
});
