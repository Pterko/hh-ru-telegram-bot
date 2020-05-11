/**
 * Created by Pter on 12.04.2016.
 */
const request = require('request');

const useragent = 'HeadHunterTelegramBot/1.0 (pter96@gmail.com)';

function handleAnswer(err, res, body, callback) {
  if (err) {
    callback(err);
    return;
  }
  // console.log(body);
  const json = JSON.parse(body);
  if (json.error || json.errors) {
    callback(json);
    return;
  }
  callback(null, json);
}

// TODO: add spaces after commas in functions

module.exports.findVacanciesByQuery = (options, callback) => {
  request.get(
    {
      url: `https://api.hh.ru/vacancies?text=${encodeURIComponent(options.query)}&order_by=relevance&area=1&per_page=${
        options.per_page
      }&page=${options.page}`,
      headers: {
        // 'Authorization' : ' Bearer '+token,
        'User-Agent': useragent,
      },
    },
    (err, res, body) => {
      handleAnswer(err, res, body, (arg1, arg2) => {
        callback(arg1, arg2);
      });
    }
  );
};

module.exports.updateToken = function(token, refreshToken, callback) {
  request.post(
    {
      url: 'https://hh.ru/oauth/token',
      headers: {
        Authorization: ` Bearer ${token}`,
        'User-Agent': useragent,
      },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    },
    function(err, res, body) {
      handleAnswer(err, res, body, callback);
    }
  );
};

module.exports.getResumeViews = function(options, callback) {
  request.get(
    {
      url: `https://api.hh.ru/resumes/${options.resume_id}/views?per_page=${options.per_page ||
        20}&page=${options.page || 0}`,
      headers: {
        Authorization: ` Bearer ${options.token}`,
        'User-Agent': useragent,
      },
    },
    function(err, res, body) {
      handleAnswer(err, res, body, callback);
    }
  );
};

// TODO: understand why function handler differs from others
module.exports.updateResume = function(token, resumeId, callback) {
  request.post(
    {
      url: `https://api.hh.ru/resumes/${resumeId}/publish`,
      headers: {
        Authorization: ` Bearer ${token}`,
        'User-Agent': useragent,
      },
    },
    (err, res, body) => {
      const { statusCode } = res;
      console.log(`Update resume result: ${body}`);
      console.log('Status code is:', statusCode);
      if (body.length === 0) {
        return callback(null, statusCode);
      }
      const json = JSON.parse(body);
      if (json.error || json.errors) {
        console.log('We are jumping out in a callback with two arguments');
        return callback(json, statusCode);
      }
      // console.log(res);
      return callback(null, statusCode);
    }
  );
};

function getMyResumes(token, callback) {
  request.get(
    {
      url: 'https://api.hh.ru/resumes/mine?per_page=10000',
      headers: {
        Authorization: ` Bearer ${token}`,
        'User-Agent': useragent,
      },
    },
    function(err, res, body) {
      handleAnswer(err, res, body, callback);
    }
  );
}

module.exports.getMyResumes = getMyResumes;

module.exports.getMyInfo = function(token, callback) {
  request.get(
    {
      url: 'https://api.hh.ru/me',
      headers: {
        Authorization: ` Bearer ${token}`,
        'User-Agent': useragent,
      },
    },
    function(err, res, body) {
      handleAnswer(err, res, body, callback);
    }
  );
};

module.exports.getAccessTokenByCode = function(code, callback) {
  request.post(
    {
      // 'Content-Type' : 'application/x-www-form-urlencoded',
      url: 'https://hh.ru/oauth/token',
      form: {
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI,
      },
    },
    function(err, res, body) {
      handleAnswer(err, res, body, callback);
    }
  );
};
