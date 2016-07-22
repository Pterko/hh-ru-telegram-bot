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


    resumeSelectButtonsGenerator(user){
        let buttonsArray = [];
        for (let i = 0; i < user.storage.resume.resumes.length; i++){
            let resume = JSON.parse(user.storage.resume.resumes[i]);
            buttonsArray.push([{text: `№${i+1} - ${resume.title}`, callback_data: `select_resume_${i}`}]);
        }

        log.info("Buttons line generated:",buttonsArray);
        return buttonsArray;
    }

    specificResumeButtonsGenerator(user){
        let buttonsArray = [];
        let selectedResume = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]);
        //create button for "auto-update enable/disable"
        if (user.autoUpdatedResumes.find( x => x.id == selectedResume.id)){
            buttonsArray.push([{text:"Выключить автообновление резюме", callback_data:"resume_autoupdate_disable"}]);
        } else {
            buttonsArray.push([{text:"Включить автообновление резюме", callback_data:"resume_autoupdate_enable"}]);
        }
        //create button for "resume views monitoring enable/disable"
        if (user.lastTimeViews.find( x => x.id == selectedResume.id)){
            buttonsArray.push([{text:"Выключить мониторинг просмотров резюме", callback_data:"resume_monitoring_disable"}]);
        } else {
            buttonsArray.push([{text:"Включить мониторинг просмотров резюме", callback_data:"resume_monitoring_enable"}]);
        }

        buttonsArray.push([{text:"Обновить резюме", callback_data:"resume_update"}]);
        buttonsArray.push([{text:"Увидеть просмотры резюме", callback_data:"resume_show_views"}]);
        buttonsArray.push([{text:"Вернуться в начало", callback_data:"go_start"}]);


        return buttonsArray;
    }

    resumeUpdateHandle(user, msg, callback){
        log.info("We're into resumeUpdateHandle function");
        let selectedResume = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]);
        if (selectedResume.status.id == "published"){
            hh.updateResume(user.token.access_token, selectedResume.id, (err,res) =>{
                log.info("UpdateResumeResult:"+res);
                if ( res == 204 ){
                    let autoUpdatedResume = user.autoUpdatedResumes.find( x => x.id == selectedResume.id);
                    if (autoUpdatedResume){
                        autoUpdatedResume.lastTimeUpdate = Date.now();
                    }
                    return callback({
                        showAlert: "Резюме обновлено"
                    });
                }
                if ( res == 429 ){
                    return callback({
                        showAlert: "Еще рано для обновления, попробуйте позже"
                    });
                }
            });
        } else {
            return callback({
                showAlert: "Данное резюме еще не опубликовано, не могу обновить его!"
            })
        }
    }

    // this method should return buttons array
    resumeViewsButtonsGenerator(user){
        let buttonsArrayLine = [];
        if (user.storage.resume.viewsShow.page > 0){
            buttonsArrayLine.push({text: "Предыдущая страница", callback_data: "resume_views_prev_page"});
        }
        if (user.storage.resume.viewsShow.page != user.storage.resume.viewsShow.pages - 1 ){
            buttonsArrayLine.push({text: "Следующая страница", callback_data: "resume_views_next_page"});
        }
        buttonsArrayLine.push({text: "К резюме", callback_data: "go_specific_resume_menu"});

        log.info("Buttons line generated:",buttonsArrayLine);
        return [buttonsArrayLine];
    }

    prepareViewsInfo(user, callback){
        log.warn("We're in prepareViewsInfo");
        user.storage.resume.viewsShow.page = 0;
        this.generateViewsForResumeViewsShow(user, callback);
    }

    generateViewsForResumeViewsShow(user, callback){
        hh.getResumeViews({
            token: user.token.access_token,
            resume_id: JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id,
            page: user.storage.resume.viewsShow.page,
            per_page: 10
        }, (err,json) => {
            if(err){
                throw new Error(err);
            }
            user.storage.resume.viewsShow.page = json.page;
            user.storage.resume.viewsShow.pages = json.pages;
            user.storage.resume.viewsShow.found = json.found;
            //now we need to generate String-list for message
            log.info(json);
            var viewsStr = "";
            for(let view of json.items){
                viewsStr += view.created_at + " | ";

                viewsStr += `[${view.employer.name}](${view.employer.url})`;

                viewsStr += "\n";

            }

            user.storage.resume.viewsShow.pageStr = viewsStr;
            log.info("Prepared pageStr, user looks now like: ",user);
            callback(user, undefined);
        });
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

    enableResumeAutoupdate(user, msg){
        log.info("We are in enableResumeAutoupdate function");
        let currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
        if (user.autoUpdatedResumes.find( x => x.id == currentResumeId )){
            return {
                showAlert: "Автообновление уже включено!"
            };
        }
        user.autoUpdatedResumes.push( {id: currentResumeId} );
        log.info("User after push:",user);
        return {
            showAlert: "Автообновление резюме было включено!"
        };
    }

    disableResumeAutoupdate(user, msg){
        log.info("We are in disableResumeAutoupdate function");
        let currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
        let resumeIndex = user.autoUpdatedResumes.findIndex( x => x.id == currentResumeId);
        log.info("Index of deleted element:",resumeIndex);
        if (resumeIndex > -1) {
            user.autoUpdatedResumes.splice(resumeIndex, 1);
        }
        log.info("User after splice:",user);
        return {
            showAlert: "Автообновление резюме было выключено!"
        };
    }


    enableResumeMonitoring(user, msg){
        log.info("We are in enableResumeMonitoring function");
        let currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
        if (user.lastTimeViews.find( x => x.id == currentResumeId )){
            return {
                showAlert: "Мониторинг уже включен!"
            };
        }
        user.lastTimeViews.push( {id: currentResumeId, views: JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).new_views } );
        log.info("User after push:",user);
        return {
            showAlert: "Мониторинг новых просмотров активирован!"
        };
    }

    disableResumeMonitoring(user, msg){
        log.info("We are in disableResumeMonitoring function");
        let currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
        let resumeIndex = user.lastTimeViews.findIndex( x => x.id == currentResumeId);
        log.info("Index of deleted element:",resumeIndex);
        if (resumeIndex > -1) {
            user.lastTimeViews.splice(resumeIndex, 1);
        }
        log.info("User after splice:",user);
        return {
            showAlert: "Мониторинг резюме деактивировано!"
        };
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

    forgetUser(user, msg, callback){
        callback(user,{});
        user.remove();
    }

    resumeManageSelect(user, msg, callback){
        //in this method we need to check token existence
        log.info("We're in resume manage select function ",user.token);
        log.info(user.token.length);
        let callbackAnswer = {};
        if (user.token.access_token == null || user.token.access_token == undefined  ){
            log.info("We in no token branch");
            // change state to awaitTokenState
            callbackAnswer.setState = "awaitTokenState";
            return callback(callbackAnswer);
        } else {
            //check that user have resumes and token is working
            hh.getMyResumes(user.token.access_token, (err,json) => {
                if (err) {
                    return bot.sendMessage(user._id, "Возникла ошибка при выполнении запроса:", err);
                }
                let resumes  = json.items;
                if (resumes.length == 0){
                    callbackAnswer.setState = "noResumesState";
                    return callback(callbackAnswer);
                }
                user.storage.resume.resumes = [];
                // if we have resumes, prepare info for button and text-generators
                for(let i = 0; i < resumes.length; i++){
                    user.storage.resume.resumes.push(JSON.stringify(resumes[i]));
                }
                callbackAnswer.setState = "selectResumeState";
                return callback(callbackAnswer);

            });
        }
    }

    handleResumeSelect(user, msg){
        log.info("I'M INTO HANDLE RESUME SELECT");
        if (msg.value){
            user.storage.resume.selectedResumeOffset = msg.value;
            //so, now we need to change our state specific resume dialog
            return { setState: "specificResumeState" };
        }
        return {};
    }

    acceptCode(code, user_id){
        //so, in this method we accept code from user and try to receive normal hh.ru api code
        log.info("Received code ",code," for user ",user_id);
        this.handler.getUserObjectFromMsg({from:{id:user_id}},(err,user) =>{
            log.info("User: ",user);

            user.token.access_token = "123";
            hh.getAccessTokenByCode(code, (err,json) =>{
                if (err) {
                    bot.sendMessage(user_id,"Токен неправильный, попробуйте еще.");
                    throw new Error(err);
                }
                user.token = json;
                //user.token.expires_at = Date.now() + parseInt(user.token.expires_in);
                user.token.expires_at = Math.round(Date.now()/1000) + parseInt(json.expires_in);
                log.warn(user);
                user.markModified('token');
                user.save(result => log.warn(result)).then(result => log.warn(result));
                this.handler.foreignEventReceiver(user_id,{setState:"tokenReceivedSuccess"});
            });
        });
    }

}

module.exports = scenarioModule;