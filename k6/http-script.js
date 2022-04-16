import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const url = 'http://localhost:8181/v1/data/rules/allow';
  const payload = JSON.stringify({
    input: {
      user: "alice"
    }
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  check(res, { 
    'status was 200': (r) => r.status == 200,
    'result was true': (r) => r.json().result == true
  });
}
