/**
 * Created by Pter on 24.06.2016.
 */
"use strict";

var hh = require("../hhApi");

class inlineVacationsHandler {
    constructor(bot){
        this.bot = bot;
        this.bot.on('inline_query',this.handler.bind(this));
    }


    handler(msg){
        console.log(this.bot);
        console.log(msg);

        //var answers = [{type:'article',id:'1',title:'title',input_message_content:{message_text:'http://0s.nf2hk3tfom.mfyha3dffzrw63i.cmle.ru/ru/app/telegram-messenger/id686449807?mt=8'},url:'http://0s.nf2hk3tfom.mfyha3dffzrw63i.cmle.ru/ru/app/telegram-messenger/id686449807?mt=8'}];
        //this.bot.answerInlineQuery(msg.id, answers);
        //return;
        hh.findVacanciesByQuery(msg.query,(err,json) => {
            console.log(err);
            //console.log(json);
            var vacancies = json.items;
            var answers = [];
            for (var i = 0; i < vacancies.length && i < 10; i++) {
                var vacancy = vacancies[i];
                var article = {};
                console.log(vacancy);
                article.type = "article";
                article.id = i.toString();
                article.title = vacancy.name;
                if (vacancy.salary != null){
                    article.description = "Зарплата:";
                    if (vacancy.salary.from != null){
                        article.description += " от " + vacancy.salary.from + vacancy.salary.currency;
                    }
                    if (vacancy.salary.to != null){
                        article.description += " до " + vacancy.salary.to  + vacancy.salary.currency;
                    }
                } else {
                    article.description = "Зарплата не указана";
                }

                article.description += "\n";

                if (vacancy.snippet != null){
                    if(vacancy.snippet.requirement != null){
                        article.description += ("Требования: " + vacancy.snippet.requirement + "\n");
                    }
                    if(vacancy.snippet.responsibility != null){
                        article.description += ("Обязанности: " + vacancy.snippet.responsibility + "\n");
                    }
                }

                article.url = vacancy.alternate_url;
                //article.hide_url = true;
                if (vacancy.employer.logo_urls != null) {
                    article.thumb_url = vacancy.employer.logo_urls.original;
                    console.log(article.thumb_url);
                    //article.thumb_width = 90;
                    //article.thumb_height = 90;
                }
                var text = article.description;
                text = text.replace(new RegExp('<highlighttext>', 'g'),'<b>').replace(new RegExp('</highlighttext>', 'g'),'</b>');
                article.input_message_content = {message_text: text + article.url,parse_mode: "HTML"};
                answers.push(article);
            }
            this.bot.answerInlineQuery(msg.id, answers);
        });
    }
}

module.exports = inlineVacationsHandler;