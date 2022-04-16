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
k6 run --duration 5s ./k6/http-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 17060 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=14ns     min=0s       med=0s       max=248µs   p(90)=0s       p(95)=0s
     
     http_req_duration..............: avg=219.47µs min=131µs    med=186µs    max=16.81ms p(90)=235µs    p(95)=294µs

     http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s      p(90)=0s       p(95)=0s
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
k6 run --duration 5s ./k6/https-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 12372 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=21ns     min=0s       med=0s       max=270µs    p(90)=0s       p(95)=0s
     
     http_req_duration..............: avg=309.91µs min=199µs    med=265µs    max=16.64ms  p(90)=347µs    p(95)=438µs

     http_req_tls_handshaking.......: avg=12.13µs  min=0s       med=0s       max=150.07ms p(90)=0s       p(95)=0s
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
k6 run --duration 5s ./k6/mtls-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 11816 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=28ns     min=0s       med=0s       max=332µs    p(90)=0s       p(95)=0s

     http_req_duration..............: avg=324.3µs  min=203µs    med=274µs    max=17.17ms  p(90)=356µs    p(95)=430µs

     http_req_tls_handshaking.......: avg=15.69µs  min=0s       med=0s       max=185.51ms p(90)=0s       p(95)=0s
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
k6 run --duration 5s ./k6/mtls-script.js
```

Results (redacted for brevity)
```less
running (05.0s), 0/1 VUs, 8006 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  5s

     http_req_connecting............: avg=41ns     min=0s       med=0s      max=333µs    p(90)=0s       p(95)=0s
     
     http_req_duration..............: avg=512.51µs min=320µs    med=434µs   max=15.94ms  p(90)=616.5µs  p(95)=866.75µs

     http_req_tls_handshaking.......: avg=21.01µs  min=0s       med=0s      max=168.26ms p(90)=0s       p(95)=0s
```
