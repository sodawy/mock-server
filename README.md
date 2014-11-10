mock-server (not release)
===========

a node mock server.

### set mock response by request /setResponse
```
curl 'http://127.0.0.1/setResponse?url=%2Faaa&res=mockContent'
//response: 1415625948774_127.0.0.1  #relate-key
```

### set mock response by request /proxy
```
curl 'http://127.0.0.1/proxy?ip=1.1.1.1&path=/aaa'
```

### get mock response
```
curl -b 'fe_mock=1415625948774_127.0.0.1' 'http://127.0.0.1/aaa'
//response: mockContent
```

##Attribute Usage
| *url* | *paramter in request* | *response* |
| -------- | -------- | -------- |
| /setResponse | `url`{string}, `res`{string}, `contentType`{json|html|javascript|text}, `delay`{number} | relate-key{string} |
| /proxy | `isCache`, `ip`, `path`, `host`, `port`, `contentType` | relate-key(isCache=true) or proxy res |
| /getResponse | `url`, `key` | res |
| / | have cookie which key=`fe_mock` and value is $relate-key | res |

##featrue
* 20min clear cache
* if /setResponse has delay paramter, the / response will delay seconds
* the / must have cookie. the key is `fe_mock`, the value is relate-keys join with , (eg: fe_mock=k1,k2,k3)

