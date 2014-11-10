mock-server (not release)
===========

a node mock server.

```shell
#set mock response
  curl 'http://127.0.0.1/setResponse?url=%2Faaa&res=mockContent'
    #1415625948774_127.0.0.1  #relate-key

#get mock response
  #style1 
    curl -b 'fe_mock=1415625948774_127.0.0.1' 'http://127.0.0.1/aaa'
  #style2 
    curl 'http://127.0.0.1/getResponse?url=%2Faaa&key=1415625948774_127.0.0.1'
    #mockContent
```
