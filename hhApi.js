/**
 * Created by Pter on 12.04.2016.
 */
var request = require('request');
var jsonfile = require('jsonfile');
var config = jsonfile.readFileSync("./config.json");  // init config


var useragent = "HeadHunterTelegramBot/1.0 (pter96@gmail.com)";

//TODO: add spaces after commas in functions

module.exports.findVacanciesByQuery = function(options,callback){
    request.get({
        url : 'https://api.hh.ru/vacancies?text='+encodeURIComponent(options.query)+'&order_by=relevance&area=1&per_page=' + options.per_page + '&page=' + options.page,
        headers: {
            //'Authorization' : ' Bearer '+token,
            'User-Agent' : useragent
        },
    },function(err,res,body){
        handleAnswer(err,res,body,callback);
    })
};




module.exports.updateToken = function(token,refreshToken,callback){
    request.post({
        url : 'https://hh.ru/oauth/token',
        headers: {
            'Authorization' : ' Bearer '+token,
            'User-Agent' : useragent
        },
        form : {
            'grant_type' : 'refresh_token',
            'refresh_token' : refreshToken
        }
    },function(err,res,body){
        handleAnswer(err,res,body,callback);
    })
};



module.exports.getResumeViews = function(options,callback){
    request.get({
        url : 'https://api.hh.ru/resumes/'+options.resume_id+'/views?per_page=' + (options.per_page || 20) + '&page=' + (options.page || 0),
        headers: {
            'Authorization' : ' Bearer '+options.token,
            'User-Agent' : useragent
        }
    },function(err,res,body){
        handleAnswer(err,res,body,callback);
    })
};



//TODO: understand why function handler differs from others
module.exports.updateResume = function(token,resume_id,callback){
    request.post({
        url : 'https://api.hh.ru/resumes/'+resume_id+'/publish',
        headers: {
            'Authorization' : ' Bearer '+token,
            'User-Agent' : useragent
        }
    },function(err,res,body){
        console.log("Update resume result: "+body);
        if (body.length == 0) {
            return callback(null,res.statusCode);
        }
        var json = JSON.parse(body);
        if (json.error || json.errors) {callback((json),res.statusCode); return;}
        //console.log(res);
        callback(null,res.statusCode);
    })
};

function getMyResumes(token, callback){
    request.get({
        url : 'https://api.hh.ru/resumes/mine?per_page=10000',
        headers: {
            'Authorization' : ' Bearer '+token,
            'User-Agent' : useragent
        }
    },function(err,res,body){
        handleAnswer(err,res,body,callback);
    })

};

module.exports.getMyResumes = getMyResumes;

module.exports.getMyInfo = function(token,callback){
    request.get({
        url : 'https://api.hh.ru/me',
        headers: {
            'Authorization' : ' Bearer '+token,
            'User-Agent' : useragent
        }
    },function(err,res,body){
        handleAnswer(err,res,body,callback);
    })
};


module.exports.getAccessTokenByCode = function(code,callback){
    request.post({
        //'Content-Type' : 'application/x-www-form-urlencoded',
        url : 'https://hh.ru/oauth/token',
        form : {
            grant_type:'authorization_code',
            client_id: config.client_id,
            client_secret: config.client_secret,
            code: code,
            redirect_uri: config.redirect_uri
        }
    },function(err,res,body){
        handleAnswer(err,res,body,callback);
    })
};

function handleAnswer(err,res,body,callback){
    if (err) {callback(err); return;}
    //console.log(body);
    var json = JSON.parse(body);
    if (json.error || json.errors) {callback((json)); return;}
    callback(null,json);
};