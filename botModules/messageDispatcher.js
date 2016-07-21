/**
 * Created by Pter on 26.06.2016.
 */
"use strict";

var log4js = require('log4js');
var log = log4js.getLogger('HHTELEGRAMBOT');
var YAML = require('js-yaml');
var fs = require('fs');

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/hhTelegramBot');
var User = require("./models/user");


class messageDispatcher {
    constructor(bot, scenarioHandler){
        this.bot = bot;
        this.scenarioHandler = scenarioHandler;
        var str = fs.readFileSync("./scenario.yaml",{encoding: "utf-8"});
        //console.log(str);
        this.scenario = YAML.safeLoad(str);
        //log.info("Loaded scenario:", this.scenario );
        log.info("Loaded scenario:", JSON.stringify(this.scenario) );

        this.bot.on('message',this.messageHandler.bind(this));
        this.bot.on('callback_query',this.messageHandler.bind(this));

        //also prepare arrays for easy search
        this.dataHandlersNames = this.scenario.dataHandlers.map( elem => elem.name);
        console.log(this.dataHandlersNames);
    }

    //receives all messages from user
    messageHandler(msg){
        log.info("Received message:",msg);
        //first of all, find user, that write message to us
        this.getUserObjectFromMsg(msg, (err, user) =>{
            //ok, received user object for mongodb, process forward
            if (err){
                log.warn("Error while receiving user object: ",err);
                this.bot.sendMessage(msg.from.id,"Ошибка во время получения объекта пользователя. Повторите запрос позже");
                return;
            }
            log.info("User: ",user,"\nReceived message: ",msg);
            if (msg.data){
                this.callbackHandler(msg, user);
            } else {
                this.dispatchMessage(msg, user);
            }
        });
    }

    // receives only inline buttons press
    callbackHandler(msg, user){
        log.warn("We're in callback handler");
        log.info(msg);
        // here we need to change stored value of user-state and update previous message
        let dataHandler = this.findDataHandlerByName(msg.data);
        log.info("DataHandler: ",dataHandler);
        if (dataHandler) {
            let promises = [];
            if (dataHandler.setState){
                user.state = dataHandler.setState;
            }
            //append regexp-finded value to msg
            if (dataHandler.value){
                msg.value = dataHandler.value;
            }


            if (typeof this.scenarioHandler[dataHandler.handlerFunction] === "function" ){
                if(dataHandler.handlerFunctionAsync == true){
                    promises.push(new Promise((resolve,reject) => {
                        this.scenarioHandler[dataHandler.handlerFunction](user, msg, (callbackAnswer) =>{
                            log.info("CallbackAnswer:",callbackAnswer);
                            if(callbackAnswer.setState){
                                this.changeUserState(user, callbackAnswer.setState).then((resolveLocal, rejectLocal) => {
                                    resolve();
                                });
                            }
                            resolve();
                        });
                    }))
                } else {
                    promises.push(new Promise((resolve,reject) => {
                        let callbackAnswer = this.scenarioHandler[dataHandler.handlerFunction](user, msg);
                        log.info("CallbackAnswer:",callbackAnswer);
                        if(callbackAnswer.setState){
                            this.changeUserState(user, callbackAnswer.setState).then((resolveLocal, rejectLocal) => {
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    }))
                }
            }
            Promise.all(promises).then( () => {
                user.save();
                this.updateLastMessageAccordingToState(msg, user);
            });
        } else {
            this.bot.sendMessage(msg.from.id,"Don't understand this data param");
        }
    }

    updateLastMessageAccordingToState(msg, user){
        //var stateObject = this.scenario.states.find(x => x.name == user.state);
        //log.info("StateObject: ",stateObject);
        //var options = {
        //    chat_id: user._id,
        //    message_id: msg.message.message_id,
        //};
        //if (stateObject.inlineButtonsGenerator){
        //    var inlineButtons = this.scenarioHandler[stateObject.inlineButtonsGenerator](user);
        //    options.reply_markup = JSON.stringify({
        //        inline_keyboard: inlineButtons
        //    });
        //} else {
        //    options.reply_markup = JSON.stringify({
        //        inline_keyboard: stateObject.buttons
        //    });
        //}

        this.emitMessage(user, undefined, undefined , true);
        //log.info("Updated buttons: ", options);
        //this.bot.editMessageText(stateObject.text,options);
    }

    //sendNewMessage(user,text,options){
    //    var responseText = eval('`'+text+'`');
    //    this.bot.sendMessage(user._id,responseText,options).then((result) =>{
    //        log.info("New message sended, result:",result);
    //        user.lastMessageId = result.message_id;
    //    })
    //}

    emitMessage(user,text,options,update){
        var stateObject = this.findStateByName(user.state);
        log.info("Entered in emitMessage func, state:",stateObject);

        if(options == undefined){
            options = {};
        }

        let responseText = "";
        if (text){
            responseText = eval('`'+text+'`');
        } else {
            responseText = eval('`'+stateObject.text+'`');
        }

        if (stateObject.inlineButtonsGenerator){
            var inlineButtons = this.scenarioHandler[stateObject.inlineButtonsGenerator](user);
            log.info("Used inline generator, buttons:",inlineButtons);
            options.reply_markup = JSON.stringify({
                inline_keyboard: inlineButtons
            });
        } else {
            log.info("Don't used inline generator");
            options.reply_markup = JSON.stringify({
                inline_keyboard: stateObject.buttons
            });
        }

        if (stateObject.parseMode){
            options.parse_mode = stateObject.parseMode;
        }


        if (update == true){
            options.chat_id = user._id;
            options.message_id = user.lastMessageId;
            this.bot.editMessageText(responseText,options);
        } else {
            log.info("Send message with options:",options);
            this.bot.sendMessage(user._id, responseText, options).then((result) => {
                log.info("New message sended, result:", result);
                user.lastMessageId = parseInt(result.message_id);
                user.markModified('lastMessageId');

                user.save().then( (result, result1) => {
                    log.info("res1",result);
                    log.info("res2",result1);
                });
                log.info(user);
            });
        }
    }


    //receives only text-like messages from user
    dispatchMessage(msg, user){
        log.warn("We're in dispatcher!!11");
        var stateObject = this.findStateByName(user.state);
        log.info("StateObject: ",stateObject);
        if(stateObject.textExpected){
            //accept text and check, that function-handler exists
            if(stateObject.textHandlerFunction != "undefined" && typeof this.scenarioHandler[stateObject.textHandlerFunction] === "function"){
                //just call this function
                if(stateObject.textHandlerFunctionAsync){
                    this.scenarioHandler[stateObject.textHandlerFunction](user, msg.text, this.textMessageCallbackHandler.bind(this));
                } else {
                    var functionResult = this.scenarioHandler[stateObject.textHandlerFunction](user, msg.text);
                }
            } else {
                log.error("Text handling error occurred! Debug info below. Function name:",stateObject.textHandlerFunction,". Function object:",this.scenarioHandler[stateObject.textHandlerFunction]);
            }
        } else {
            //TODO: think about error messaging, then text don't expected
            //currenty repeat form, we can also write error message
            var options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: stateObject.buttons
                })
            };
            //TODO: think about removing eval
            var responseText = eval('`'+stateObject.text+'`');
            this.emitMessage(user,responseText,options,false);
        }
    }

    textMessageCallbackHandler(user, callbackAnswer){
        log.info(this);
        var promises = [];
        if(callbackAnswer.setState){
            promises.push(this.changeUserState(user, callbackAnswer.setState));
        }
        Promise.all(promises).then( () => {
            user.save();
        });
    }

    foreignEventReceiver(user_id, options){
        this.getUserObjectFromMsg({from:{id:user_id}},(err,user) => {
            if (options.setState) {
                this.changeUserState(user, options.setState);
            }
        });
    }

    changeUserState(user, newState){
        return new Promise( (resolve, reject) => {
            user.state = newState;
            log.info("User " + user._id + " state changed to " + newState);
            log.info(user);
            //now run onEnter function of new state, and only after all complete method.
            var stateObject = this.findStateByName(user.state);
            log.info("StateObject: ",stateObject);
            //check that onEnter exists
            if (typeof this.scenarioHandler[stateObject.onEnterHandlerFunction] === "function"){
                if(stateObject.onEnterHandlerFunctionAsync){
                    log.info("Runned async version of onEnter function");
                    this.scenarioHandler[stateObject.onEnterHandlerFunction](user, (user, callbackAnswer) =>{
                        log.info("useeeeer:",user);
                        user.save();
                        if(stateObject.newMessageOnEnter){
                            this.emitMessage(user, stateObject.text, {}, false);
                        } else {
                            this.emitMessage(user, stateObject.text, {}, true);
                        }
                        resolve();
                    });
                } else {
                    var functionResult = this.scenarioHandler[stateObject.onEnterHandlerFunction](user);
                    if(stateObject.newMessageOnEnter){
                        this.emitMessage(user, stateObject.text, {}, false);
                    } else {
                        this.emitMessage(user, stateObject.text, {}, true);
                    }
                    user.save();
                    resolve();
                }
            } else {
                if(stateObject.newMessageOnEnter){
                    this.emitMessage(user, stateObject.text, {}, false);
                } else {
                    this.emitMessage(user, stateObject.text, {}, true);
                }
                user.save();
                resolve();
            }

        });
    }


    findStateByName(name){
        return this.scenario.states.find(x => x.name == name);
    }

    findDataHandlerByName(name){
        let dataHandler = this.scenario.dataHandlers.find(x => x.name == name);
        //so, if we don't find dataHandler by name, try to find it by param
        if (dataHandler == undefined){
            log.info("Try to find dataHandler by regexp");
            let appendedValue;
            dataHandler = this.scenario.dataHandlers.find( x => {
                if (x.nameIsRegexp){
                    let newName = x.name.replace("INTVALUE","(\\d{1,})");
                    log.info(newName);
                    log.warn(name.match(newName));
                    if (name.match(newName)) {
                        appendedValue = name.match(newName)[1];
                        return true;
                    } else {
                        return false;
                    }
                }
                return false;
            });

            //if dataHandler found, append value to it
            if (dataHandler){
                dataHandler.value = appendedValue;
                log.info("Finded dataHandler:",dataHandler);
            }
        }
        return dataHandler;
    }


    // gets User object from mongodb
    getUserObjectFromMsg(msg, callback){
        User.findOne({_id:msg.from.id}, (err,user) => {
            if (err){
                log.warn(err);
                return callback(err);
            }
            console.log("Users arr: "+user);
            if (user == undefined && user == null){
                log.info("Create new user");
                var newUserObject = {
                    _id: msg.from.id,
                    fist_name: msg.from.fist_name,
                    last_name: msg.from.last_name,
                    username: msg.from.username,
                    state: "start"
                };
                User.create(newUserObject,(err, user) => {
                    if (err){
                        log.warn(err);
                        return callback(err);
                    }
                    return callback(null, user);

                })
            } else {
                return callback(null, user);
            }
        });
    }

}

module.exports = messageDispatcher;