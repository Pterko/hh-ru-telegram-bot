const ScenarioModule = require('../scenarioModule');

// Mock dependencies
jest.mock('mongoose'); // Mocking mongoose
jest.mock('../../hhApi.js'); // Mocking hhApi
jest.mock('../messageDispatcher.js'); // Mocking messageDispatcher
const mockBot = {
  sendMessage: jest.fn(),
  answerCallbackQuery: jest.fn(),
};

describe('ScenarioModule', () => {
  let scenarioModule;
  let mockUser;

  beforeEach(() => {
    // Reset mocks and create new instances for each test
    jest.clearAllMocks();
    scenarioModule = new ScenarioModule(mockBot);
    mockUser = {
      id: 123,
      storage: {
        search: {
          page: 0,
          pages: 5,
          vacancySearchQuery: '',
          vacancyStr: '',
          found: 0,
        },
        resume: {
          resumes: [],
          selectedResumeOffset: 0,
          viewsShow: {
            page: 0,
            pages: 0,
            found: 0,
            pageStr: '',
          },
        },
      },
      token: {
        access_token: 'fake_access_token',
      },
      autoUpdatedResumes: [],
      lastTimeViews: [],
      save: jest.fn().mockImplementation(callback => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      markModified: jest.fn(),
      remove: jest.fn(),
    };
  });

  describe('vacancySearchTextHandler', () => {
    it('should update user storage and call callback', () => {
      const mockCallback = jest.fn();
      const searchText = 'Software Engineer';
      scenarioModule.vacancySearchTextHandler(mockUser, searchText, mockCallback);

      expect(mockUser.storage.search.vacancySearchQuery).toBe(searchText);
      expect(mockCallback).toHaveBeenCalledWith(mockUser, { setState: 'vacancySearchState' });
    });
  });

  describe('vacancySearchButtonsGenerator', () => {
    it('should return "В начало" button when no prev/next pages', () => {
      mockUser.storage.search.page = 0;
      mockUser.storage.search.pages = 1; // Only one page
      const buttons = scenarioModule.vacancySearchButtonsGenerator(mockUser);
      expect(buttons).toEqual([
        [{ text: 'В начало', callback_data: 'go_start' }],
      ]);
    });

    it('should return "Следующая страница" and "В начало" if on first page and multiple pages exist', () => {
      mockUser.storage.search.page = 0;
      mockUser.storage.search.pages = 3;
      const buttons = scenarioModule.vacancySearchButtonsGenerator(mockUser);
      expect(buttons).toEqual([
        [
          { text: 'Следующая страница', callback_data: 'search_next_page' },
          { text: 'В начало', callback_data: 'go_start' },
        ],
      ]);
    });

    it('should return "Предыдущая страница" and "В начало" if on last page and multiple pages exist', () => {
      mockUser.storage.search.page = 2;
      mockUser.storage.search.pages = 3;
      const buttons = scenarioModule.vacancySearchButtonsGenerator(mockUser);
      expect(buttons).toEqual([
        [
          { text: 'Предыдущая страница', callback_data: 'search_prev_page' },
          { text: 'В начало', callback_data: 'go_start' },
        ],
      ]);
    });

    it('should return all three buttons if on a middle page', () => {
      mockUser.storage.search.page = 1;
      mockUser.storage.search.pages = 3;
      const buttons = scenarioModule.vacancySearchButtonsGenerator(mockUser);
      expect(buttons).toEqual([
        [
          { text: 'Предыдущая страница', callback_data: 'search_prev_page' },
          { text: 'Следующая страница', callback_data: 'search_next_page' },
          { text: 'В начало', callback_data: 'go_start' },
        ],
      ]);
    });
  });

  describe('enableResumeAutoupdate', () => {
    it('should add resume to autoUpdatedResumes and return success message if not already enabled', () => {
      mockUser.storage.resume.resumes = [JSON.stringify({ id: 'resume123' })];
      mockUser.storage.resume.selectedResumeOffset = 0;
      const result = scenarioModule.enableResumeAutoupdate(mockUser);
      expect(mockUser.autoUpdatedResumes).toContainEqual({ id: 'resume123' });
      expect(result).toEqual({ showAlert: 'Автообновление резюме было включено!' });
    });

    it('should return already enabled message if resume is already in autoUpdatedResumes', () => {
      mockUser.storage.resume.resumes = [JSON.stringify({ id: 'resume123' })];
      mockUser.storage.resume.selectedResumeOffset = 0;
      mockUser.autoUpdatedResumes = [{ id: 'resume123' }];
      const result = scenarioModule.enableResumeAutoupdate(mockUser);
      expect(result).toEqual({ showAlert: 'Автообновление уже включено!' });
    });
  });

  describe('disableResumeAutoupdate', () => {
    it('should remove resume from autoUpdatedResumes and return success message if enabled', () => {
      mockUser.storage.resume.resumes = [JSON.stringify({ id: 'resume123' })];
      mockUser.storage.resume.selectedResumeOffset = 0;
      mockUser.autoUpdatedResumes = [{ id: 'resume123' }];
      const result = scenarioModule.disableResumeAutoupdate(mockUser);
      expect(mockUser.autoUpdatedResumes).not.toContainEqual({ id: 'resume123' });
      expect(result).toEqual({ showAlert: 'Автообновление резюме было выключено!' });
    });

    it('should do nothing and return success message if not enabled', () => {
      // Note: Current implementation doesn't distinguish, might be an area for improvement in the original code.
      // For now, testing existing behavior.
      mockUser.storage.resume.resumes = [JSON.stringify({ id: 'resume123' })];
      mockUser.storage.resume.selectedResumeOffset = 0;
      const result = scenarioModule.disableResumeAutoupdate(mockUser);
      expect(mockUser.autoUpdatedResumes).toEqual([]);
      expect(result).toEqual({ showAlert: 'Автообновление резюме было выключено!' });
    });
  });

  // Add more describe blocks for other functions like:
  // resumeSelectButtonsGenerator
  // specificResumeButtonsGenerator
  // resumeUpdateHandle (requires mocking hh.updateResume)
  // resumeViewsButtonsGenerator
  // prepareViewsInfo (requires mocking hh.getResumeViews)
  // generateViewsForResumeViewsShow (requires mocking hh.getResumeViews)
  // prepareSearchInfo (requires mocking hh.findVacanciesByQuery)
  // generateVacanciesForUserSearch (requires mocking hh.findVacanciesByQuery)
  // enableResumeMonitoring
  // disableResumeMonitoring
  // forgetUser
  // resumeManageSelect (requires mocking hh.getMyResumes)
  // resumeAnalyticsHandler
  // handleResumeSelect
  // acceptNotification (might need more complex bot mocking)
  // acceptCode (requires mocking hh.getAccessTokenByCode and handler.getUserObjectFromMsg)
  // updateResumeTaskFunction (requires mocking hh.updateResume)
  // updateResumeViewsTaskFunction (requires mocking hh.getMyResumes)
  // updateUserTokensTaskFunction (requires mocking hh.updateToken)

});
