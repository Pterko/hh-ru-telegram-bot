/**
 * Created by Pter on 16.07.2016.
 */
"use strict";
var log4js = require('log4js');
var log = log4js.getLogger('HHTELEGRAMBOT');
var scenarioHandler = require('./messageDispatcher.js');

class scenarioModule {
    constructor(bot){
        this.bot = bot;
        this.handler = new scenarioHandler(bot, this);
    }

    vacancySearchTextHandler(User, text, callback){
        log.info(text);
        var callbackResponse = {
            setState : "vacancyFindState"
        };
        user.vacancySearchQuery = text;
        callback(User, callbackResponse);
    }

    vacancySearchButtonGenerator(User){
        return {reply_markup: JSON.stringify({
            inline_keyboard: []
        })};
    }

}

module.exports = scenarioModule;