var http = require('http');
var urlModule = require('url');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var Log = require('log');

var app = express();
var log = new Log('info');

var SERVER_PORT = 80;
var COOKIE_KEY = 'fe_mock';
var CACHE_TIMEOUT = 20*60*1000; //20min
var MINE = {
    json: 'application/json',
    html: 'text/html',
    text: 'text/plain',
    javascript: 'application/javascript'
};

var responseMap = {}; //responseMap = {relate-url: {relate-key: {res:'', contentType: '', delay: 0}}}

setInterval(clearCache, CACHE_TIMEOUT);//clear cache before 5min

app.use(bodyParser.urlencoded({ extended: false }));    //parse application/x-www-form-urlencoded
app.use(bodyParser.json()); //parse application/json
app.use(cookieParser());

/**
 *   set custom response, return a relate-key
 *
 *   @param url {in request paramter} the relate-url
 *   @param res {in request paramter} the custom response
 *   @param contentType {in request paramter}
 *   @param delay {in request paramter} second
 *
 *   @return relate-key {in response}
 */
app.use('/setResponse', function(req, res){
    var path = req.param('url');
    var delay = req.param('delay');
    var key = generateKey(req);

    cacheResponse(key, path, req.param('res'), req.param('contentType'), delay);

    res.send(key);
});



/**
 *   get custom response by url&relate-key
 *
 *  @param url {in request paramter} the relate-url
 *  @param key {in request paramter} the relate-key
 *
 *  @return {in response}
 */
app.use('/getResponse', function(req, res){
    var key = req.param('key');
    var path = req.param('url');

    if(key && path && responseMap[path] && responseMap[path][key]){
        res.set('Content-Type', responseMap[path][key]['contentType']);
        res.send(responseMap[path][key]['res']);
    }else{
        res.send('no match res');
    }
});

/**
 *  proxy response
 *
 *  @param isCache {in request paramter} is not direct response the proxy content
 *  @param path {in request paramter} target uri path
 *  @param ip {in request paramter} target uri ip
 *  @param port {in request paramter} target uri port, default 80
 *  @param host {in request paramter} proxy request header host
 *
 *  @return relate-key or proxy response
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
 *  handle the real request (the real scene or the simulate operation)
 *      the request path is the relate-url
 *      the request have cookie named COOKIE_KEY, value is relate-key.
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
                if(mock['delay']){
                    log.info('delay response start, url(%s)', path);
                    setTimeout(function(){
                        log.info('delay response over, url(%s)', path);
                        res.send(mock['res']);
                    }, mock['delay']);
                }else{
                    res.send(mock['res']);
                }
                break;
            }
        }
    }else{
        res.send('no match res');
    }
});

function clearCache(){
    log.info('start clear cache!');

    var beyondPoint = new Date().getTime() - CACHE_TIMEOUT;
    Object.keys(responseMap).forEach(function(url){
        Object.keys(responseMap[url]).forEach(function(key){
            var time = Number(key.split('_')[0]);
            if(time && time <= beyondPoint){
                delete responseMap[url][key];
                log.info('clear cache, url: %s, key: %s', url, key);
            }
        });
    });

    log.info('end clear cache!');
}

/**
 * cacheResponse
 *
 * @param key
 * @param path
 * @param res
 * @param contentType
 * @param delay (second)
 */
function cacheResponse(key, path, res, contentType, delay){
    contentType = contentType && MINE[contentType] ? MINE[contentType] : MINE['json'];
    delay = delay*1000 || 0;

    if(!responseMap[path]){
        responseMap[path] = {};
    }

    responseMap[path][key] = { res: res, contentType: contentType, delay: delay };
}

function generateKey(req){
    return new Date().getTime().toString() + '_' + req.ip;
}



app.listen(SERVER_PORT);
log.info('mock server start at port: %s', SERVER_PORT);