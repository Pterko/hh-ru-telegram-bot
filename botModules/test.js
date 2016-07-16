/**
 * Created by Pter on 26.06.2016.
 */
/**
 * Created by Pter on 24.06.2016.
 */
"use strict";



    class inlineVacationsHandler {
        constructor(bot){
            this.bot = bot;
            this.bot.on('inline_query',this.handler);
        }

        handler(msg){
           console.log(this.bot);
        }
    }


    var bot = new TelegramBot(config.token_dev, {polling: true});

    var inline = new inlineVacationsHandler(bot);
