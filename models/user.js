var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
  id: Number,
  lastMessageId: Number,
  firstName: String,
  lastName: String,
  state: String,
  username: String,
  token: {
    access_token: String,
    token_type: String,
    expires_at: Number,
    expires_in: Number,
    refresh_token: String
  },
  lastTimeViews: [
    {
      id: String,
      views: Number
    }
  ],
  autoUpdatedResumes: [
    {
      id: String,
      lastTimeUpdate: Number,
      lastTryToUpdate: Number
    }
  ],
  resumeItems: [mongoose.Schema.Types.Mixed],
  selectedResumeId: String,
  
  storage: {
    // search: {
    //   vacancySearchQuery: String,
    //   page: Number,
    //   pages: Number,
    //   found: Number,
    //   vacancyStr: String
    // },
    // analytics: {
    //   last_week_views: Number,
    //   comparison_percent: Number,
    //   comparison_word: String
    // },
    resume: {
      resumes: [String], // each element: resume
      resumes_json: [{}],
      resume_views: [
        {
          resume_id: String,
          views: [{}]
        }
      ],
      resume_analytics: [
        {
          resume_id: String,
          last_week_views: Number,
          comparison_percent: Number,
          comparison_word: String
        }
      ],
      selectedResumeOffset: Number,
      viewsShow: {
        pages: Number,
        page: Number,
        found: Number,
        pageStr: String
      }
    }
  }
});

var User = mongoose.model("User", userSchema);

module.exports = User;