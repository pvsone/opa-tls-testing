# OPA TLS Testing
Basic performance testing of OPA with TLS enabled

## Overview
This is not a production performance test setup.  The goal is a basic test to 
show relative performance differences when various OPA TLS settings are 
enabled on an OPA running in server mode.

I'm running both the OPA agent and [k6](https://k6.io/docs/) test client on my local mac laptop.

## Test 1: No TLS settings (baseline)
Run OPA (OPA version 0.39.0)
```sh
opa run --server --bundle ./bundle
```

Run k6 `http-script.js` test (k6 version 0.37.0)
```sh
k6 run --no-vu-connection-reuse --no-connection-reuse --duration 5s ./k6/http-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 11334 complete and 0 interrupted iterations
default ✗ [======================================] 1 VUs  5s

     http_req_connecting............: avg=92.12µs  min=70µs    med=87µs     max=2.44ms   p(90)=107µs    p(95)=117µs

     http_req_duration..............: avg=253.6µs  min=163µs   med=210µs    max=144.67ms p(90)=265µs    p(95)=307.35µs

     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s       max=0s       p(90)=0s       p(95)=0s
```

## Test 2: TLS on OPA Server
Create `localhost` server cert using [certstrap](https://github.com/square/certstrap)
```sh
certstrap init --common-name "CertAuth"
certstrap request-cert --domain localhost
certstrap sign localhost --CA CertAuth
```

Verify the server cert
```sh
openssl x509 -in ./out/localhost.crt -noout -text
```

Enable trust for the CA on the mac host
```sh
open out/CertAuth.crt
# When open in 'Keychain access', expand 'Trust" section and set to 'Trust Always'
```

Run OPA with [TLS enabled](https://www.openpolicyagent.org/docs/latest/security/#tls-and-https)
```sh
opa run --server --bundle ./bundle \
  --tls-cert-file out/localhost.crt \
  --tls-private-key-file out/localhost.key
```

Run k6 `https-script.js` test
```sh
k6 run --no-vu-connection-reuse --no-connection-reuse --duration 5s ./k6/https-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 1582 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=137.32µs min=78µs   med=137µs  max=2.09ms   p(90)=160µs   p(95)=168µs

     http_req_duration..............: avg=457.72µs min=262µs  med=437µs  max=1.38ms   p(90)=569.9µs p(95)=711µs

     http_req_tls_handshaking.......: avg=2.4ms    min=1.89ms med=2.3ms  max=148.75ms p(90)=2.46ms  p(95)=2.63ms
```

## Test 3: mTLS Client Authentication
Create `client` cert
```sh
certstrap request-cert --cn client
certstrap sign client --CA CertAuth
```

Verify the client cert
```sh
openssl x509 -in ./out/client.crt -noout -text
```

Run OPA with [TLS Authentication](https://www.openpolicyagent.org/docs/latest/security/#tls-based-authentication-example)
```sh
opa run --server --bundle ./bundle \
  --tls-cert-file out/localhost.crt \
  --tls-private-key-file out/localhost.key \
  --tls-ca-cert-file out/CertAuth.crt \
  --authentication=tls
```

Run k6 `mtls-script.js` test
```sh
k6 run --no-vu-connection-reuse --no-connection-reuse --duration 5s ./k6/mtls-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 977 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=143.81µs min=80µs   med=144µs  max=1.9ms    p(90)=162µs    p(95)=169µs

     http_req_duration..............: avg=790.27µs min=490µs  med=759µs  max=2.32ms   p(90)=946.39µs p(95)=1.24ms

     http_req_tls_handshaking.......: avg=4.01ms   min=3.23ms med=3.89ms max=149.29ms p(90)=4.12ms   p(95)=4.42ms
```

## Test 4: mTLS Client AuthN + AuthZ policy
Run OPA with TLS AuthN and [Basic AuthZ](https://www.openpolicyagent.org/docs/latest/security/#authentication-and-authorization
)
```sh
opa run --server --bundle ./bundle \
  --tls-cert-file out/localhost.crt \
  --tls-private-key-file out/localhost.key \
  --tls-ca-cert-file out/CertAuth.crt \
  --authentication=tls \
  --authorization=basic
```

Run k6 `mtls-script.js` test
```sh
k6 run --no-vu-connection-reuse --no-connection-reuse --duration 5s ./k6/mtls-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 927 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=147.85µs min=82µs   med=148µs  max=2.27ms   p(90)=166µs  p(95)=176.69µs

     http_req_duration..............: avg=1ms      min=637µs  med=960µs  max=3.1ms    p(90)=1.31ms p(95)=1.51ms

     http_req_tls_handshaking.......: avg=4.06ms   min=3.22ms med=3.92ms max=156.73ms p(90)=4.12ms p(95)=4.37ms
```
