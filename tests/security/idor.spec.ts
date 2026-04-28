import { test, expect } from '@playwright/test';

/**
 * Security Test Suite: Insecure Direct Object Reference (IDOR)
 * Tests if users can access or modify resources belonging to other users.
 */
test.describe('Security: IDOR Protection', () => {
  const BASE_URL = process.env.PLAYWRIGHT_TEST_URL || 'http://localhost:3000';

  test('should not allow access to another user\'s report', async ({ request }) => {
    // This test assumes we have a valid report ID from another user.
    // In a real DAST, we would scan for IDs.
    const targetReportId = 'another-user-report-123';
    
    const response = await request.get(`${BASE_URL}/api/reports/${targetReportId}`, {
      headers: {
        'Cookie': 'wap_session=mock-user-session-token'
      }
    });

    // Should be 403 Forbidden or 404 Not Found (to prevent existence disclosure)
    expect([403, 404, 401]).toContain(response.status());
  });

  test('should not allow access to another user\'s project', async ({ request }) => {
    const targetProjectId = 'another-user-project-456';
    
    const response = await request.get(`${BASE_URL}/api/projects/${targetProjectId}`, {
      headers: {
        'Cookie': 'wap_session=mock-user-session-token'
      }
    });

    expect([403, 404, 401]).toContain(response.status());
  });

  test('should not allow a regular member to invite users to a team', async ({ request }) => {
    // We already fixed this in the previous step, so this test should pass now.
    const response = await request.post(`${BASE_URL}/api/teams/members`, {
      headers: {
        'Cookie': 'wap_session=regular-member-token',
        'Content-Type': 'application/json'
      },
      data: {
        email: 'victim@example.com'
      }
    });

    // Should be 403 Forbidden since the member is not an admin
    expect(response.status()).toBe(403);
  });
});
