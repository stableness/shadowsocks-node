[![npm version](https://badgen.net/npm/v/@stableness/shadowsocks-node)](https://www.npmjs.com/package/@stableness/shadowsocks-node)
[![vulnerabilities](https://snyk.io/test/npm/@stableness/shadowsocks-node/badge.svg)](https://snyk.io/test/npm/@stableness/shadowsocks-node) 

One dedicated Shadowsocks client running in Node.js, the code is heavily brought from [wabble](https://github.com/stableness/wabble) which has far more features e.g.: DoH, http proxy, multi server and filter rules, check that out in such cases.



# Install

```
npm install -g @stableness/shadowsocks-node
```

or

```
npx @stableness/shadowsocks-node
```



# Usage

```
ss-node

  -l, --local     socks5://127.0.0.1:8080   or   :8080 as socks5://0.0.0.0:8080

  -r, --remote    ss://password@example.com:4242
                  ss://method:password@example.com:4242
                  ss://base64url( method:password )@example.com:4242
                  ss://base64( method:password@example.com:4242 )

  -k, --key       overwrite the PASSWORD

  -m, --method    optional overwrite the method, default to chacha20-ietf-poly1305

  -q, --quiet     suppress logging, silent mode
```

