// __tests__/types.test.ts

import {
  ActionInputs,
  ChangesetInput,
  SmartDefaults,
  DocHolidayRequest,
  DocHolidayResponse,
  ActionOutputs
} from '../src/types';

describe('TypeScript Type Definitions', () => {
  describe('ActionInputs', () => {
    it('should compile with required fields', () => {
      const input: ActionInputs = {
        apiToken: 'test-token'
      };
      expect(input.apiToken).toBe('test-token');
    });

    it('should compile with all optional fields', () => {
      const input: ActionInputs = {
        apiToken: 'test-token',
        eventType: 'release',
        title: 'Test Release',
        body: 'Release notes',
        publications: ['pub1', 'pub2'],
        sourceConnection: 'github',
        labels: ['label1'],
        comments: ['comment1'],
        relevantLinks: ['https://example.com'],
        changeset: {
          releasesCount: 5
        }
      };
      expect(input.eventType).toBe('release');
      expect(input.publications).toHaveLength(2);
    });
  });

  describe('ChangesetInput', () => {
    it('should compile with release-based changeset', () => {
      const changeset: ChangesetInput = {
        releasesCount: 3,
        timeRangeStart: '2024-01-01',
        timeRangeEnd: '2024-12-31'
      };
      expect(changeset.releasesCount).toBe(3);
    });

    it('should compile with commit-based changeset', () => {
      const changeset: ChangesetInput = {
        commitsCount: 10,
        commitsSinceSha: 'abc123',
        commitsShas: ['sha1', 'sha2'],
        commitsStartSha: 'start-sha',
        commitsEndSha: 'end-sha',
        commitsIncludeStart: true
      };
      expect(changeset.commitsCount).toBe(10);
      expect(changeset.commitsShas).toHaveLength(2);
    });

    it('should compile with tag-based changeset', () => {
      const changeset: ChangesetInput = {
        tagsStart: 'v1.0.0',
        tagsEnd: 'v2.0.0'
      };
      expect(changeset.tagsStart).toBe('v1.0.0');
    });
  });

  describe('SmartDefaults', () => {
    it('should compile with required fields', () => {
      const defaults: SmartDefaults = {
        title: 'Auto-generated title',
        body: 'Auto-generated body'
      };
      expect(defaults.title).toBe('Auto-generated title');
    });

    it('should compile with optional fields', () => {
      const defaults: SmartDefaults = {
        title: 'Release v1.0.0',
        body: 'Release notes',
        eventType: 'release',
        changes: [{ id: 1 }, { id: 2 }]
      };
      expect(defaults.eventType).toBe('release');
      expect(defaults.changes).toHaveLength(2);
    });
  });

  describe('DocHolidayRequest', () => {
    it('should compile with required fields', () => {
      const request: DocHolidayRequest = {
        docRequest: {
          title: 'Test Doc',
          body: 'Test body',
          sourceConnection: 'github'
        }
      };
      expect(request.docRequest.title).toBe('Test Doc');
    });

    it('should compile with all optional fields', () => {
      const request: DocHolidayRequest = {
        docRequest: {
          title: 'Test Release',
          body: 'Release notes',
          sourceConnection: 'github',
          publications: ['blog'],
          labels: ['feature'],
          comments: ['Great work!'],
          relevantLinks: ['https://github.com'],
          eventType: 'release',
          changes: [{ sha: 'abc123' }]
        }
      };
      expect(request.docRequest.eventType).toBe('release');
      expect(request.docRequest.publications).toHaveLength(1);
    });
  });

  describe('DocHolidayResponse', () => {
    it('should compile with all required fields', () => {
      const response: DocHolidayResponse = {
        id: 'job-123',
        orgId: 'org-456',
        type: 'documentation',
        state: 'requested'
      };
      expect(response.id).toBe('job-123');
      expect(response.state).toBe('requested');
    });

    it('should accept all valid state values', () => {
      const states: DocHolidayResponse['state'][] = ['requested', 'running', 'done', 'errored'];
      states.forEach(state => {
        const response: DocHolidayResponse = {
          id: 'job-123',
          orgId: 'org-456',
          type: 'documentation',
          state
        };
        expect(response.state).toBe(state);
      });
    });
  });

  describe('ActionOutputs', () => {
    it('should compile with all required fields', () => {
      const output: ActionOutputs = {
        jobId: 'job-123',
        jobState: 'done',
        jobUrl: 'https://doc.holiday/jobs/123'
      };
      expect(output.jobId).toBe('job-123');
      expect(output.jobState).toBe('done');
      expect(output.jobUrl).toBe('https://doc.holiday/jobs/123');
    });
  });
});
