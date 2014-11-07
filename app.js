var http = require('http');
var urlModule = require('url');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var app = express();

var COOKIE_KEY = 'fe_mock';
var CACHE_TIMEOUT = 5*60*1000; //5min
var MINE = {
    json: 'application/json',
    html: 'text/html',
    text: 'text/plain',
    javascript: 'application/javascript'
};

var responseMap = {}; //responseMap = {path: {key: {res:''}}}

setInterval(clearCache, CACHE_TIMEOUT);//clear cache before 5min

app.use(bodyParser.urlencoded({ extended: false }));    //parse application/x-www-form-urlencoded
app.use(bodyParser.json()); //parse application/json
app.use(cookieParser());

/**
 *   设置要mock的响应体
 */
app.use('/setResponse', function(req, res){
    var path = req.param('url');
    var key = generateKey(req);

    cacheResponse(key, path, req.param('res'), req.param('contentType'));

    res.send(key);
});

/**
 *   获取url&key对应的响应体
 */
app.use('/getResponse', function(req, res){
    var key = req.param('key');
    var path = req.param('url');

    if(key && path && responseMap[path] && responseMap[path][key]){
        res.set('Content-Type', responseMap[path][key]['contentType']);
        res.send(responseMap[path][key]['res']);
    }
});

/**
 *  代理请求接口（参数取自参数）
 */
app.use('/proxy', function(req, res){
    var isCache = req.param('isCache');
    var contentType = req.param('contentType');
    var path = req.param('path');
    var pathName = urlModule.parse(path).pathname;
    var requestOpt = {
        host: req.param('ip'),
        path: path,
        port: req.param('port') || 80,
        headers: { Host: req.param('host') }
    };

    http.get(requestOpt, function(resProxy) {
        var resProxyText = [];
        resProxy.on('data', function (chunk) {
            resProxyText.push(chunk);
        });
        resProxy.on('end', function(){
            var resBody = new Buffer(resProxyText.join(''));
            if(isCache == 'true'){
                var key = generateKey(req);
                cacheResponse(key, pathName, resBody, contentType);
                res.send(key);
            }else{
                res.send(resBody);
            }
        })
    });
});

/**
 *  返回被设置过的key的响应体
 */
app.use('/', function(req, res){
    var mockKeys = (req.cookies[COOKIE_KEY] || '').split(',');
    var path = req.path;

    if(mockKeys.length && responseMap[path]){
        var pathMap = responseMap[path];
        for(var i= 0, len=mockKeys.length; i<len; i++){
            var mock = pathMap[mockKeys[i]];
            if(mock){
                res.set('Content-Type', mock['contentType']);
                res.send(mock['res']);
                break;
            }
        }
    }else{
        res.send('no match res');
    }
});

function clearCache(){
    var beyondPoint = new Date().getTime() - CACHE_TIMEOUT;
    Object.keys(responseMap).forEach(function(url){
        Object.keys(responseMap[url]).forEach(function(key){
            var time = Number(key.split('_')[0]);
            if(time && time <= beyondPoint){
                delete responseMap[url][key];
            }
        })
    })
}

function cacheResponse(key, path, res, contentType){
    contentType = contentType && MINE[contentType] ? MINE[contentType] : MINE['json'];
    if(!responseMap[path]){
        responseMap[path] = {};
    }

    responseMap[path][key] = { res: res, contentType: contentType };
}

function generateKey(req){
    return new Date().getTime().toString() + '_' + req.ip;
}



app.listen(80);
