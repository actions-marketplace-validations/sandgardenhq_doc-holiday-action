// __tests__/inputs.test.ts
import * as core from '@actions/core';
import { parseInputs } from '../src/inputs';
import { ActionInputs } from '../src/types';

// Mock @actions/core
jest.mock('@actions/core');

const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;

describe('parseInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock returns empty string for all inputs
    mockGetInput.mockReturnValue('');
  });

  describe('required inputs', () => {
    it('should parse api-token as required', () => {
      mockGetInput.mockImplementation((name: string, options?: core.InputOptions) => {
        if (name === 'api-token') {
          expect(options?.required).toBe(true);
          return 'test-token-123';
        }
        if (name === 'event-type') return 'release';
        return '';
      });

      const result = parseInputs();
      expect(result.apiToken).toBe('test-token-123');
    });
  });

  describe('event-type handling', () => {
    it('should parse event-type as release', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        return '';
      });

      const result = parseInputs();
      expect(result.eventType).toBe('release');
    });

    it('should parse event-type as merge', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'merge';
        return '';
      });

      const result = parseInputs();
      expect(result.eventType).toBe('merge');
    });

    it('should parse event-type as custom', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'custom';
        if (name === 'title') return 'Test Title';
        if (name === 'body') return 'Test Body';
        return '';
      });

      const result = parseInputs();
      expect(result.eventType).toBe('custom');
    });

    it('should handle empty event-type as undefined', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'title') return 'Test Title';
        if (name === 'body') return 'Test Body';
        return '';
      });

      const result = parseInputs();
      expect(result.eventType).toBeUndefined();
    });
  });

  describe('manual mode validation', () => {
    it('should require title when event-type is custom', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'custom';
        if (name === 'body') return 'Test Body';
        return '';
      });

      expect(() => parseInputs()).toThrow('title is required when event-type is not set or is "custom"');
    });

    it('should require body when event-type is custom', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'custom';
        if (name === 'title') return 'Test Title';
        return '';
      });

      expect(() => parseInputs()).toThrow('body is required when event-type is not set or is "custom"');
    });

    it('should require title when event-type is not set', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'body') return 'Test Body';
        return '';
      });

      expect(() => parseInputs()).toThrow('title is required when event-type is not set or is "custom"');
    });

    it('should require body when event-type is not set', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'title') return 'Test Title';
        return '';
      });

      expect(() => parseInputs()).toThrow('body is required when event-type is not set or is "custom"');
    });

    it('should not require title/body when event-type is release', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        return '';
      });

      expect(() => parseInputs()).not.toThrow();
    });

    it('should not require title/body when event-type is merge', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'merge';
        return '';
      });

      expect(() => parseInputs()).not.toThrow();
    });
  });

  describe('comma-separated parsing', () => {
    it('should parse publications from comma-separated string', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'publications') return 'api-docs,user-guide,changelog';
        return '';
      });

      const result = parseInputs();
      expect(result.publications).toEqual(['api-docs', 'user-guide', 'changelog']);
    });

    it('should trim whitespace from publications', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'publications') return ' api-docs , user-guide , changelog ';
        return '';
      });

      const result = parseInputs();
      expect(result.publications).toEqual(['api-docs', 'user-guide', 'changelog']);
    });

    it('should filter empty values from publications', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'publications') return 'api-docs,,user-guide,';
        return '';
      });

      const result = parseInputs();
      expect(result.publications).toEqual(['api-docs', 'user-guide']);
    });

    it('should parse labels from comma-separated string', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'labels') return 'weekly,automated,release';
        return '';
      });

      const result = parseInputs();
      expect(result.labels).toEqual(['weekly', 'automated', 'release']);
    });

    it('should parse relevant-links from comma-separated string', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'relevant-links') return 'https://example.com,https://docs.example.com';
        return '';
      });

      const result = parseInputs();
      expect(result.relevantLinks).toEqual(['https://example.com', 'https://docs.example.com']);
    });

    it('should return undefined for empty comma-separated inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        return '';
      });

      const result = parseInputs();
      expect(result.publications).toBeUndefined();
      expect(result.labels).toBeUndefined();
      expect(result.relevantLinks).toBeUndefined();
    });
  });

  describe('multiline parsing (comments)', () => {
    it('should parse comments from multiline string', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'comments') return 'Focus on breaking changes\nInclude migration examples\nSkip minor fixes';
        return '';
      });

      const result = parseInputs();
      expect(result.comments).toEqual([
        'Focus on breaking changes',
        'Include migration examples',
        'Skip minor fixes',
      ]);
    });

    it('should trim whitespace from comment lines', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'comments') return '  Focus on breaking changes  \n  Include migration examples  ';
        return '';
      });

      const result = parseInputs();
      expect(result.comments).toEqual([
        'Focus on breaking changes',
        'Include migration examples',
      ]);
    });

    it('should filter empty lines from comments', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'comments') return 'Focus on breaking changes\n\nInclude migration examples\n';
        return '';
      });

      const result = parseInputs();
      expect(result.comments).toEqual([
        'Focus on breaking changes',
        'Include migration examples',
      ]);
    });

    it('should return undefined for empty comments', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        return '';
      });

      const result = parseInputs();
      expect(result.comments).toBeUndefined();
    });
  });

  describe('simple string inputs', () => {
    it('should parse title', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'title') return 'My Custom Title';
        if (name === 'body') return 'My Body';
        return '';
      });

      const result = parseInputs();
      expect(result.title).toBe('My Custom Title');
    });

    it('should parse body', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'title') return 'My Title';
        if (name === 'body') return 'My Custom Body';
        return '';
      });

      const result = parseInputs();
      expect(result.body).toBe('My Custom Body');
    });

    it('should parse source-connection', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'source-connection') return 'my-org/my-repo';
        return '';
      });

      const result = parseInputs();
      expect(result.sourceConnection).toBe('my-org/my-repo');
    });

    it('should return undefined for empty string inputs', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        return '';
      });

      const result = parseInputs();
      expect(result.title).toBeUndefined();
      expect(result.body).toBeUndefined();
      expect(result.sourceConnection).toBeUndefined();
    });
  });

  describe('changeset parsing', () => {
    it('should parse releases-count changeset', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'releases-count') return '2';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: 2,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: undefined,
        commitsSinceSha: undefined,
        commitsShas: undefined,
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: undefined,
        tagsEnd: undefined,
      });
    });

    it('should parse time-range changeset', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'time-range-start') return '2025-01-01T00:00:00Z';
        if (name === 'time-range-end') return '2025-01-31T23:59:59Z';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: '2025-01-01T00:00:00Z',
        timeRangeEnd: '2025-01-31T23:59:59Z',
        commitsCount: undefined,
        commitsSinceSha: undefined,
        commitsShas: undefined,
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: undefined,
        tagsEnd: undefined,
      });
    });

    it('should parse commits-count changeset', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-count') return '10';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: 10,
        commitsSinceSha: undefined,
        commitsShas: undefined,
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: undefined,
        tagsEnd: undefined,
      });
    });

    it('should parse commits-since-sha changeset', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-since-sha') return 'abc123def456';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: undefined,
        commitsSinceSha: 'abc123def456',
        commitsShas: undefined,
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: undefined,
        tagsEnd: undefined,
      });
    });

    it('should parse commits-shas changeset', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-shas') return 'abc123,def456,789ghi';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: undefined,
        commitsSinceSha: undefined,
        commitsShas: ['abc123', 'def456', '789ghi'],
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: undefined,
        tagsEnd: undefined,
      });
    });

    it('should parse commits-range changeset with include-start', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-start-sha') return 'abc123';
        if (name === 'commits-end-sha') return 'def456';
        if (name === 'commits-include-start') return 'true';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: undefined,
        commitsSinceSha: undefined,
        commitsShas: undefined,
        commitsStartSha: 'abc123',
        commitsEndSha: 'def456',
        commitsIncludeStart: true,
        tagsStart: undefined,
        tagsEnd: undefined,
      });
    });

    it('should parse commits-range changeset with include-start false', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-start-sha') return 'abc123';
        if (name === 'commits-end-sha') return 'def456';
        if (name === 'commits-include-start') return 'false';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset?.commitsIncludeStart).toBe(false);
    });

    it('should parse tags changeset with start and end', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'tags-start') return 'v1.0.0';
        if (name === 'tags-end') return 'v1.1.0';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: undefined,
        commitsSinceSha: undefined,
        commitsShas: undefined,
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: 'v1.0.0',
        tagsEnd: 'v1.1.0',
      });
    });

    it('should parse tags changeset with only start', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'tags-start') return 'v1.0.0';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toEqual({
        releasesCount: undefined,
        timeRangeStart: undefined,
        timeRangeEnd: undefined,
        commitsCount: undefined,
        commitsSinceSha: undefined,
        commitsShas: undefined,
        commitsStartSha: undefined,
        commitsEndSha: undefined,
        commitsIncludeStart: undefined,
        tagsStart: 'v1.0.0',
        tagsEnd: undefined,
      });
    });

    it('should return undefined changeset when no changeset inputs provided', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        return '';
      });

      const result = parseInputs();
      expect(result.changeset).toBeUndefined();
    });
  });

  describe('changeset mutual exclusivity validation', () => {
    it('should throw error when releases-count and commits-count are both specified', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'releases-count') return '2';
        if (name === 'commits-count') return '10';
        return '';
      });

      expect(() => parseInputs()).toThrow(/Multiple changeset types specified/);
      expect(() => parseInputs()).toThrow(/releases-count/);
      expect(() => parseInputs()).toThrow(/commits-count/);
    });

    it('should throw error when time-range and commits-since-sha are both specified', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'time-range-start') return '2025-01-01T00:00:00Z';
        if (name === 'commits-since-sha') return 'abc123';
        return '';
      });

      expect(() => parseInputs()).toThrow(/Multiple changeset types specified/);
      expect(() => parseInputs()).toThrow(/time-range/);
      expect(() => parseInputs()).toThrow(/commits-since-sha/);
    });

    it('should throw error when commits-shas and tags-start are both specified', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-shas') return 'abc123,def456';
        if (name === 'tags-start') return 'v1.0.0';
        return '';
      });

      expect(() => parseInputs()).toThrow(/Multiple changeset types specified/);
      expect(() => parseInputs()).toThrow(/commits-shas/);
      expect(() => parseInputs()).toThrow(/tags/);
    });

    it('should throw error when commits-start-sha and releases-count are both specified', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'commits-start-sha') return 'abc123';
        if (name === 'commits-end-sha') return 'def456';
        if (name === 'releases-count') return '2';
        return '';
      });

      expect(() => parseInputs()).toThrow(/Multiple changeset types specified/);
      expect(() => parseInputs()).toThrow(/commits-range/);
      expect(() => parseInputs()).toThrow(/releases-count/);
    });

    it('should throw error when all changeset types are specified', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'release';
        if (name === 'releases-count') return '2';
        if (name === 'time-range-start') return '2025-01-01T00:00:00Z';
        if (name === 'commits-count') return '10';
        if (name === 'commits-since-sha') return 'abc123';
        if (name === 'commits-shas') return 'abc123,def456';
        if (name === 'commits-start-sha') return 'abc123';
        if (name === 'tags-start') return 'v1.0.0';
        return '';
      });

      expect(() => parseInputs()).toThrow(/Multiple changeset types specified/);
    });
  });

  describe('complete integration scenarios', () => {
    it('should parse a complete release mode configuration', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token-123';
        if (name === 'event-type') return 'release';
        if (name === 'publications') return 'api-docs,user-guide';
        if (name === 'labels') return 'release,automated';
        if (name === 'comments') return 'Focus on breaking changes\nInclude examples';
        if (name === 'relevant-links') return 'https://example.com';
        if (name === 'releases-count') return '1';
        return '';
      });

      const result = parseInputs();
      expect(result).toEqual({
        apiToken: 'test-token-123',
        eventType: 'release',
        title: undefined,
        body: undefined,
        publications: ['api-docs', 'user-guide'],
        sourceConnection: undefined,
        labels: ['release', 'automated'],
        comments: ['Focus on breaking changes', 'Include examples'],
        relevantLinks: ['https://example.com'],
        changeset: {
          releasesCount: 1,
          timeRangeStart: undefined,
          timeRangeEnd: undefined,
          commitsCount: undefined,
          commitsSinceSha: undefined,
          commitsShas: undefined,
          commitsStartSha: undefined,
          commitsEndSha: undefined,
          commitsIncludeStart: undefined,
          tagsStart: undefined,
          tagsEnd: undefined,
        },
      });
    });

    it('should parse a complete manual mode configuration', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token-456';
        if (name === 'title') return 'Weekly Documentation Update';
        if (name === 'body') return 'Generate guides for recent user-facing changes';
        if (name === 'source-connection') return 'my-org/my-repo';
        if (name === 'publications') return 'changelog';
        if (name === 'labels') return 'weekly';
        if (name === 'commits-count') return '50';
        return '';
      });

      const result = parseInputs();
      expect(result).toEqual({
        apiToken: 'test-token-456',
        eventType: undefined,
        title: 'Weekly Documentation Update',
        body: 'Generate guides for recent user-facing changes',
        publications: ['changelog'],
        sourceConnection: 'my-org/my-repo',
        labels: ['weekly'],
        comments: undefined,
        relevantLinks: undefined,
        changeset: {
          releasesCount: undefined,
          timeRangeStart: undefined,
          timeRangeEnd: undefined,
          commitsCount: 50,
          commitsSinceSha: undefined,
          commitsShas: undefined,
          commitsStartSha: undefined,
          commitsEndSha: undefined,
          commitsIncludeStart: undefined,
          tagsStart: undefined,
          tagsEnd: undefined,
        },
      });
    });

    it('should parse minimal valid configuration', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'api-token') return 'test-token';
        if (name === 'event-type') return 'merge';
        return '';
      });

      const result = parseInputs();
      expect(result).toEqual({
        apiToken: 'test-token',
        eventType: 'merge',
        title: undefined,
        body: undefined,
        publications: undefined,
        sourceConnection: undefined,
        labels: undefined,
        comments: undefined,
        relevantLinks: undefined,
        changeset: undefined,
      });
    });
  });
});
