[![npm version](https://badgen.net/npm/v/@stableness/shadowsocks-node)](https://www.npmjs.com/package/@stableness/shadowsocks-node)
[![vulnerabilities](https://snyk.io/test/npm/@stableness/shadowsocks-node/badge.svg)](https://snyk.io/test/npm/@stableness/shadowsocks-node) 



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

  -l, --local       socks5://127.0.0.1:8080   or   :8080 as socks5://0.0.0.0:8080

  -r, --remote      ss://password@example.com:4242
                    ss://method:password@example.com:4242
                    ss://base64url( method:password )@example.com:4242
                    ss://base64( method:password@example.com:4242 )

  -k, --key         overwrite the PASSWORD

  -m, --method      optional overwrite the method, default to chacha20-ietf-poly1305

  -s, --subscribe   path to local file or remote http page contains multiline addresses

  -f, --refresh     reload subscription address in seconds, default to 3600 (1 hour)

  -q, --quiet       suppress logging, silent mode
```



<details>
<summary><i>advanced</i></summary>

          --enable_deprecated_cipher

          --third_party_providers_use_at_your_own_risk
</details>



# Examples

set local basic auth

    ss-node   -l socks5://username:password@127.0.0.1:8080

multi local proxies

    ss-node   -l socks5://127.0.0.1:8080   -l socks5://127.0.0.1:9090

multi remote addresses

    ss-node   -r ss://foo:4242   -r ss://bar:4343

multi subscription addresses

    ss-node   -s https://foo   -s https://bar

accept deprecated stream ciphers (e.g. `rc4` / `rc4-md5` / `aes-128-cfb` etc.)

    ss-node   --enable_deprecated_cipher

free providers crawling from Internet **USE AT YOUR OWN RISK**

    ss-node   --third_party_providers_use_at_your_own_risk

  - (too long...)

        ss-node   --YOLO

