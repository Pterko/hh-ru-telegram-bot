const axios = require('axios');

const useragent = 'HeadHunterTelegramBot/2.0 (pter96@gmail.com)';

const httpCall = axios.create({
  baseURL: 'https://api.hh.ru/',
  timeout: 5000,
  headers: {
    'User-Agent': useragent,
  },
  responseType: 'json',
});

module.exports.getMyResumes = async ({ token }) => {
  try {
    const httpRes = await httpCall.get('resumes/mine?per_page=10000', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // log.info('getMyResumes', httpRes);
    return httpRes.data;
  } catch (ex) {
    log.error('getMyResumes', ex);
  }
};
