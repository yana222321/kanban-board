import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const EMAIL = __ENV.EMAIL || 'manager@kanban.local';
const PASSWORD = __ENV.PASSWORD || 'Manager123!';

const loginErrors = new Rate('login_errors');
const boardLatency = new Trend('board_latency', true);

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      tags: { scenario: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startTime: '12s',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '10s', target: 0 },
      ],
      tags: { scenario: 'load' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:api}': ['p(95)<800'],
    'http_req_duration{endpoint:login}': ['p(95)<2000'],
    login_errors: ['rate<0.01'],
    board_latency: ['p(95)<800'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } },
  );
  check(res, { 'setup login ok': (r) => r.status === 200 });
  const token = res.json('accessToken');
  const projects = http
    .get(`${BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { endpoint: 'api' },
    })
    .json('projects') || [];
  const projectId = projects.length ? projects[0].id : null;

  let boardId = null;
  if (projectId) {
      const boards = http
        .get(`${BASE_URL}/api/projects/${projectId}/boards`, {
          headers: { Authorization: `Bearer ${token}` },
          tags: { endpoint: 'api' },
        })
        .json('boards') || [];
    boardId = boards.length ? boards[0].id : null;
  }
  return { token, projectId, boardId };
}

export default function (data) {
  const authHeaders = { Authorization: `Bearer ${data.token}` };

  group('auth', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } },
    );
    loginErrors.add(res.status !== 200);
    check(res, { 'login 200': (r) => r.status === 200 });
  });

  group('read projects', () => {
    const res = http.get(`${BASE_URL}/api/projects`, {
      headers: authHeaders,
      tags: { endpoint: 'api' },
    });
    check(res, { 'projects 200': (r) => r.status === 200 });
  });

  group('read board', () => {
    if (data.boardId) {
      const res = http.get(`${BASE_URL}/api/boards/${data.boardId}`, {
        headers: authHeaders,
        tags: { endpoint: 'api' },
      });
      boardLatency.add(res.timings.duration);
      check(res, { 'board 200': (r) => r.status === 200 });
    }
  });

  sleep(1);
}
