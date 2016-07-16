/**
 * Created by Pter on 26.06.2016.
 */
"use strict";

var log4js = require('log4js');
var log = log4js.getLogger('HHTELEGRAMBOT');
var YAML = require('js-yaml');
var fs = require('fs');

var mongoose = require("mongoose");
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
        if (this.dataHandlersNames.indexOf(msg.data) >= 0){
            var dataHandler = this.scenario.dataHandlers.find(x => x.name == msg.data);
            log.info("DataHandler: ",dataHandler);
            if (dataHandler.setState){
                user.state = dataHandler.setState;
            }
            user.save();
            this.updateLastMessageAccordingToState(msg, user);
        } else {
            this.bot.sendMessage(msg.from.id,"Don't understand this data param");
        }
    }

    updateLastMessageAccordingToState(msg, user){
        var stateObject = this.scenario.states.find(x => x.name == user.state);
        log.info("StateObject: ",stateObject);
        var options = {
            chat_id: user._id,
            message_id: msg.message.message_id,
            reply_markup: JSON.stringify({
                inline_keyboard: stateObject.buttons
            })
        };
        log.info("Updated buttons: ", options);
        //this.bot.editMessageReplyMarkup(options, {chat_id: user._id, message_id: msg.message.message_id})
        //    .then((x)=>{
        //        log.info("res:",x);
        //    });
        this.bot.editMessageText(stateObject.text,options);


    }

    //receives only text-like messages from user
    dispatchMessage(msg, user){
        log.warn("We're in dispatcher!!11");
        var stateObject = this.scenario.states.find(x => x.name == user.state);
        log.info("StateObject: ",stateObject);
        if(stateObject.textExpected || stateObject.textExpected == undefined ){
            //accept text and check, that function-handler exists
            if(stateObject.textHandlerFunction != "undefined" && typeof this.scenarioHandler[stateObject.textHandlerFunction] === "function"){
                //just call this function
                if(stateObject.asyncFunction){
                    this.scenarioHandler[stateObject.textHandlerFunction](user, msg.text, this.textMessageCallbackHandler.bind(this));
                } else {
                    var functionResult = this.scenarioHandler[stateObject.textHandlerFunction](user, msg.text);
                }
            } else {
                log.err("Text handling error occurred! Debug info below. Function name:",stateObject.textHandlerFunction,". Function object:",this.scenarioHandler[stateObject.textHandlerFunction]);
            }
        } else {
            //TODO: think about error messaging, then text don't expected
            //currenty repeat form, we can also write error message
            var options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: stateObject.buttons
                })
            };
            this.bot.sendMessage(msg.from.id, stateObject.text,options);
        }
    }

    textMessageCallbackHandler(user, callbackAnswer){
        log.info(this);
        if(callbackAnswer.setState){
            this.changeUserState(user, callbackAnswer.setState);
        }
        user.save();
    }

    changeUserState(user, newState){
        user.state = newState;
        log.info("User " + user._id + " state changed to "+newState);
        log.info(user);
        user.save();
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
                User.create(newUserObject,function(err, user){
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