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




    // this method should return buttons array
    vacancySearchButtonsGenerator(user){
        let buttonsArrayLine = [];
        if (user.storage.search.page > 0){
            buttonsArrayLine.push({text: "Предыдущая страница", callback_data: "search_prev_page"});
        }
        if (user.storage.search.page != user.storage.search.pages - 1 ){
            buttonsArrayLine.push({text: "Следующая страница", callback_data: "search_next_page"});
        }
        buttonsArrayLine.push({text: "В начало", callback_data: "go_start"});

        log.info("Buttons line generated:",buttonsArrayLine);
        return [buttonsArrayLine];
    }


    prepareSearchInfo(user, callback){
        user.storage.search.page = 0;
        this.generateVacanciesForUserSearch(user,callback);
    }

    searchNextPageEvent(user, msg, callback){
        user.storage.search.page++;
        this.generateVacanciesForUserSearch(user,callback);
    }

    searchPrevPageEvent(user, msg, callback){
        user.storage.search.page--;
        this.generateVacanciesForUserSearch(user,callback);
    }

    generateVacanciesForUserSearch(user,callback){
        hh.findVacanciesByQuery({
            query: user.storage.search.vacancySearchQuery,
            page: user.storage.search.page,
            per_page: 5
        }, (err,json) => {
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