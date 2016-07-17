/**
 * Created by Pter on 16.07.2016.
 */
"use strict";
var log4js = require('log4js');
var log = log4js.getLogger('HHTELEGRAMBOT');
var scenarioHandler = require('./messageDispatcher.js');
var hh = require('../hhApi');


class scenarioModule {
    constructor(bot){
        this.bot = bot;
        this.handler = new scenarioHandler(bot, this);
    }

    vacancySearchTextHandler(user, text, callback){
        log.info(text);
        var callbackResponse = {
            setState : "vacancySearchState"
        };
        user.storage.search.vacancySearchQuery = text;
        callback(user, callbackResponse);
    }

    vacancySearchButtonGenerator(user){
        return {reply_markup: JSON.stringify({
            inline_keyboard: []
        })};
    }

    prepareSearchInfo(user, callback){
        hh.findVacanciesByQuery(user.storage.search.vacancySearchQuery, (err,json) => {
            if(err){
                throw new Error(err);
            }
            user.storage.search.page = json.page;
            user.storage.search.pages = json.pages;
            user.storage.search.found = json.found;
            //now we need to generate String-list for message
            var vacancyStr = "";
            for(let vacancy of json.items){
                vacancyStr += vacancy.name + " | ";
                if (vacancy.salary != null){
                    if (vacancy.salary.from != null){
                        vacancyStr += " от " + vacancy.salary.from + vacancy.salary.currency;
                    }
                    if (vacancy.salary.to != null){
                        vacancyStr += " до " + vacancy.salary.to  + vacancy.salary.currency;
                    }
                } else {
                    vacancyStr += "Зарплата не указана";
                }
                vacancyStr += "\n";
                if (vacancy.snippet != null){
                    if(vacancy.snippet.requirement != null){
                        vacancyStr += ("Требования: " + vacancy.snippet.requirement + "\n");
                    }
                }
                vacancyStr += "\n";

            }
            vacancyStr = vacancyStr.replace(new RegExp('<highlighttext>', 'g'),'<b>').replace(new RegExp('</highlighttext>', 'g'),'</b>');
            user.storage.search.vacancyStr = vacancyStr;
            log.info("Prepared vacancyStr, user looks now like: ",user);
            callback(user, undefined);
        });
    }

}

module.exports = scenarioModule;