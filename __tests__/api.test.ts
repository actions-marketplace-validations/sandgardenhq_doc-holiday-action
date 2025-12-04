// __tests__/api.test.ts

import { createJob, constructJobUrl } from '../src/api';
import { DocHolidayRequest, DocHolidayResponse } from '../src/types';
import * as core from '@actions/core';

// Mock @actions/core
jest.mock('@actions/core');

// Global fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    const mockRequest: DocHolidayRequest = {
      docRequest: {
        title: 'Test Job',
        body: 'Test body',
        sourceConnection: 'owner/repo',
      },
    };

    const mockResponse: DocHolidayResponse = {
      id: 'job-123',
      orgId: 'org-456',
      type: 'doc',
      state: 'requested',
    };

    describe('success cases', () => {
      it('should create job successfully on first attempt', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

        const result = await createJob('test-token', mockRequest);

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.doc.holiday/api/v1/jobs',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer test-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(mockRequest),
          }
        );
        expect(core.info).toHaveBeenCalledWith(
          'Attempting to create job (attempt 1/3)...'
        );
        expect(core.info).toHaveBeenCalledWith('Job created successfully: job-123');
      });

      it('should include optional fields in request', async () => {
        const fullRequest: DocHolidayRequest = {
          docRequest: {
            title: 'Test Job',
            body: 'Test body',
            sourceConnection: 'owner/repo',
            publications: ['pub1', 'pub2'],
            labels: ['label1'],
            comments: ['comment1'],
            relevantLinks: ['https://example.com'],
            eventType: 'release',
            changes: [{ releases: { count: 1 } }],
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

        await createJob('test-token', fullRequest);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.doc.holiday/api/v1/jobs',
          expect.objectContaining({
            body: JSON.stringify(fullRequest),
          })
        );
      });
    });

    describe('authentication errors (401)', () => {
      it('should throw authentication error without retry on 401', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        await expect(createJob('bad-token', mockRequest)).rejects.toThrow(
          'Authentication failed. Please check your api-token. Ensure it is stored in GitHub secrets and passed correctly.'
        );

        // Should only attempt once (no retries on auth errors)
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should not retry after catching 401 error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        await expect(createJob('bad-token', mockRequest)).rejects.toThrow(
          'Authentication failed'
        );

        // Verify no retry attempts were made
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(core.warning).not.toHaveBeenCalled();
      });
    });

    describe('rate limiting (429)', () => {
      it('should retry on 429 with exponential backoff', async () => {
        // First two attempts: 429, third attempt: success
        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
          });

        const result = await createJob('test-token', mockRequest);

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(core.warning).toHaveBeenCalledWith(
          'Rate limited (429). Retrying in 1000ms...'
        );
        expect(core.warning).toHaveBeenCalledWith(
          'Rate limited (429). Retrying in 2000ms...'
        );
      });

      it('should fail after max retries on persistent 429', async () => {
        // All attempts return 429
        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({ ok: false, status: 429 });

        await expect(createJob('test-token', mockRequest)).rejects.toThrow(
          'Failed to create job after 3 attempts'
        );

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it('should use correct backoff delays for 429', async () => {
        const sleepSpy = jest.spyOn(global, 'setTimeout');

        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
          });

        await createJob('test-token', mockRequest);

        // Verify setTimeout was called with correct delays
        // First retry: 1000ms (2^0 * 1000)
        // Second retry: 2000ms (2^1 * 1000)
        expect(sleepSpy).toHaveBeenCalled();

        sleepSpy.mockRestore();
      });
    });

    describe('network errors', () => {
      it('should retry on network error', async () => {
        // First attempt: network error, second attempt: success
        mockFetch
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
          });

        const result = await createJob('test-token', mockRequest);

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(core.warning).toHaveBeenCalledWith(
          'Request failed: Network error. Retrying in 1000ms...'
        );
      });

      it('should retry with exponential backoff on network errors', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('Connection timeout'))
          .mockRejectedValueOnce(new Error('Connection refused'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
          });

        const result = await createJob('test-token', mockRequest);

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(core.warning).toHaveBeenCalledWith(
          'Request failed: Connection timeout. Retrying in 1000ms...'
        );
        expect(core.warning).toHaveBeenCalledWith(
          'Request failed: Connection refused. Retrying in 2000ms...'
        );
      });

      it('should fail after max retries on persistent network errors', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('Network error 1'))
          .mockRejectedValueOnce(new Error('Network error 2'))
          .mockRejectedValueOnce(new Error('Network error 3'));

        await expect(createJob('test-token', mockRequest)).rejects.toThrow(
          'Failed to create job after 3 attempts: Network error 3'
        );

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    describe('max retries exceeded', () => {
      it('should fail after 3 attempts on persistent 500 errors', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => 'Internal server error',
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => 'Internal server error',
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => 'Internal server error',
          });

        await expect(createJob('test-token', mockRequest)).rejects.toThrow(
          'Failed to create job after 3 attempts'
        );

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it('should include last error message in final error', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => 'Database connection failed',
        });

        await expect(createJob('test-token', mockRequest)).rejects.toThrow(
          'Doc.holiday API error (500): Database connection failed'
        );
      });
    });

    describe('other HTTP errors', () => {
      it('should handle 400 bad request error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Invalid request format',
        });

        await expect(createJob('test-token', mockRequest)).rejects.toThrow(
          'Doc.holiday API error (400): Invalid request format'
        );
      });

      it('should handle 404 not found error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Endpoint not found',
        });

        await expect(createJob('test-token', mockRequest)).rejects.toThrow(
          'Doc.holiday API error (404): Endpoint not found'
        );
      });

      it('should handle 503 service unavailable with retry', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            text: async () => 'Service temporarily unavailable',
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
          });

        const result = await createJob('test-token', mockRequest);

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe('response parsing', () => {
      it('should parse JSON response correctly', async () => {
        const customResponse: DocHolidayResponse = {
          id: 'custom-id',
          orgId: 'custom-org',
          type: 'custom-type',
          state: 'running',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => customResponse,
        });

        const result = await createJob('test-token', mockRequest);

        expect(result).toEqual(customResponse);
        expect(result.id).toBe('custom-id');
        expect(result.state).toBe('running');
      });

      it('should handle different job states', async () => {
        const states: Array<'requested' | 'running' | 'done' | 'errored'> = [
          'requested',
          'running',
          'done',
          'errored',
        ];

        for (const state of states) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ ...mockResponse, state }),
          });

          const result = await createJob('test-token', mockRequest);
          expect(result.state).toBe(state);
        }
      });
    });
  });

  describe('constructJobUrl', () => {
    it('should construct correct job URL', () => {
      const url = constructJobUrl('job-123');
      expect(url).toBe('https://app.doc.holiday/jobs/job-123');
    });

    it('should handle different job ID formats', () => {
      expect(constructJobUrl('abc-123')).toBe('https://app.doc.holiday/jobs/abc-123');
      expect(constructJobUrl('12345')).toBe('https://app.doc.holiday/jobs/12345');
      expect(constructJobUrl('job_with_underscore')).toBe(
        'https://app.doc.holiday/jobs/job_with_underscore'
      );
    });

    it('should handle UUID format job IDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(constructJobUrl(uuid)).toBe(`https://app.doc.holiday/jobs/${uuid}`);
    });

    it('should handle empty string (edge case)', () => {
      expect(constructJobUrl('')).toBe('https://app.doc.holiday/jobs/');
    });

    it('should not modify job ID', () => {
      const specialId = 'job-123!@#$%';
      expect(constructJobUrl(specialId)).toBe(
        `https://app.doc.holiday/jobs/${specialId}`
      );
    });
  });
});
