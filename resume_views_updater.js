var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/hhTelegramBot');

const hhApi = require('./hhApi');
const User = require('./botModules/models/user');

var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("./resume_views_updater.log"),'HHTELEGRAMBOT');
var log = log4js.getLogger('HHTELEGRAMBOT');


function waitSomeTime(time){
  return new Promise((resolve, reject) => setTimeout(resolve, time));
}

function receiveResumeViews(token, resume_id, per_page, page){
  return new Promise ((resolve, reject) => {
    hhApi.getResumeViews({
        token: token,
        resume_id: resume_id,
        per_page: per_page,
        page: page
      }, (err, data) => {
      if (err){
        return reject(err)
      }
      resolve(data);
    })
  }) 
}


async function proceed(){
  try{
    log.info("Lets find our users");

    let users = await User.find({});

    log.info("Finished!");
    log.info(`We have ${users.length} users`);

    for (let user of users){
      log.info(`Working with user ${user.id}  @${user.username}`);
      log.info(`Lets receive all resumes for him`);
      try{
        let resumes = await new Promise ((resolve, reject) => {
          hhApi.getMyResumes(user.token.access_token, (err, data) => {
            if (err){
              return reject(err)
            }
            resolve(data);
          })
        }) 
        log.info(`Resume object received. This user have ${resumes.found} resumes.`)
        user.storage.resume.resumes_json = resumes.items;
        user.storage.resume.resume_views = [];
        for (let resume of resumes.items) {
          log.info(`Working with resume ${resume.id}`);
          if (resume.new_views != 0){
            log.info(`We can't check views for that resume`);
            continue;
          }
          
          let view_pages = Math.ceil(resume.total_views/100);

          let all_views = [];

          for (let i = 0; i < view_pages; i++){
            let views = await receiveResumeViews(user.token.access_token, resume.id, 100, i);
            all_views = all_views.concat(views.items);
            await waitSomeTime(1000);
          }

          log.info(`Data received. Expected: ${resume.total_views}, received ${all_views.length}`);

          user.storage.resume.resume_views.push({
            resume_id: resume.id,
            views: all_views
          });
          
          //lets calclate last week views
          if (!user.storage.resume.resume_analytics.find(x => x.resume_id == resume.id)){
            user.storage.resume.resume_analytics.push({resume_id: resume.id});
          }

          let analitycs = user.storage.resume.resume_analytics.find(x => x.resume_id == resume.id);
          analitycs.last_week_views = 0;

          let current_date = new Date();
          for (let view of all_views){
            let timeDiff = Math.abs(current_date.getTime() - (new Date(view.created_at)).getTime());
            let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
            if (diffDays <= 7){
              analitycs.last_week_views++;
            }
          }

          // lets calculate difficult analitycs for that user
          if (analitycs.last_week_views != 0){
            let difference_array = [];
            for (let user of users){
              if (!user.storage.resume.resume_analytics || user.storage.resume.resume_analytics.length == 0){
                continue;
              }
              for (let resume of user.storage.resume.resume_analytics){
                if (resume.last_week_views && resume.last_week_views != 0){
                  difference_array.push(resume.last_week_views);
                }
              }
            }

            difference_array = difference_array.sort((a, b) => a - b);

            log.info("Dif array:", difference_array)

            let i;
            for (i = 0; i < difference_array.length; i++){
              //log.info(difference_array[i], analitycs.last_week_views)
              if (difference_array[i] >= analitycs.last_week_views){
                break;
              }
            }
            log.info("Iterator:", i)
            let percent = Math.ceil((i / difference_array.length) *100);
            analitycs.comparison_percent = percent;
          }


          await waitSomeTime(3000);
        }

        
      }catch(ex){
        log.error(`Error while work:`, ex)
      }
      user.markModified('storage');
      user.save();
      log.info(`Work with user ${user.id}  @${user.username} done. Waiting...`)
      await waitSomeTime(5000);
    }

  } catch(ex){
    log.info(ex);

  }
  proceed();
}

log.info("Starting...");

proceed();