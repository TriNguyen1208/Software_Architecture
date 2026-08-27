import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

const target = __ENV.TARGET || 'http://127.0.0.1:18080/productpage';

export default function () {
  const response = http.get(target, { tags: { endpoint: 'productpage' } });
  check(response, {
    'status is 200': (r) => r.status === 200,
    'contains product page': (r) => r.body.includes('Simple Bookstore App'),
  });
  sleep(1);
}

export function handleSummary(data) {
  return {
    'loadtest/bookinfo-summary.json': JSON.stringify(data, null, 2),
  };
}
