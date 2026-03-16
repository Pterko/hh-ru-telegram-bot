const MessageDispatcher = require('../messageDispatcher');
const ScenarioModule = require('../scenarioModule');
const User = require('../models/user'); // Needed for User.findOne, User.create
const Message = require('../models/message'); // Needed for Message constructor

// Mocks
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');

  const MockSchema = jest.fn(function(schemaDefinition) {
    this.definition = schemaDefinition;
    // Add any methods or properties to schema instances if needed, e.g., this.add = jest.fn();
  });

  MockSchema.Types = {
    Mixed: actualMongoose.Schema.Types.Mixed,
    ObjectId: actualMongoose.Schema.Types.ObjectId,
    // If other Schema types are used directly (e.g. Schema.Types.String), add them here.
    // For basic types like String, Number, Date, Mongoose usually infers them,
    // so explicit mocking might not be needed unless errors point here.
  };

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    Schema: MockSchema,
    model: jest.fn().mockImplementation((name, schema) => {
      // This mock model constructor should allow instantiation (new Model())
      // and have static methods like findOne, create mocked.
      const MockedModel = jest.fn(data => ({ // Mock for `new Model(data)`
        ...data,
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        // include other instance methods if your code uses them.
      }));
      MockedModel.findOne = jest.fn();
      MockedModel.create = jest.fn();
      MockedModel.findById = jest.fn();
      MockedModel.findByIdAndUpdate = jest.fn();
      MockedModel.deleteOne = jest.fn();
      // Add other static methods if they are used in your models or code.
      return MockedModel;
    }),
    Types: { // For direct mongoose.Types.ObjectId access
      ObjectId: actualMongoose.Types.ObjectId,
    },
    // Consider spreading actualMongoose if other specific mongoose properties are needed
    // ...actualMongoose, // Use with caution: ensure it doesn't override your critical mocks like 'model' or 'Schema'
  };
});

jest.mock('../scenarioModule'); // Mock ScenarioModule to control its behavior
// We might not need these if the mongoose.model mock above correctly returns a usable mock for User/Message
// We removed jest.mock for user and message models as mongoose.model mock should handle them.
jest.mock('fs'); // Mock fs for reading scenario.yaml

// User and Message are imported at the top of the file.
// They should receive the mocked versions from the custom mongoose mock.

const mockBot = {
  on: jest.fn(),
  sendMessage: jest.fn().mockResolvedValue({ message_id: '12345' }), // Use a parseable message_id
  answerCallbackQuery: jest.fn().mockResolvedValue(true),
  editMessageText: jest.fn().mockResolvedValue(true),
  editMessageReplyMarkup: jest.fn().mockResolvedValue(true),
};

const mockScenarioYAML = `
dataHandlers:
  - name: "go_start"
    setState: "start"
  - name: "custom_event"
    handlerFunction: "customEventHandler"
    handlerFunctionAsync: true 
  - name: "another_event"
    handlerFunction: "anotherEventHandler" 
    setState: "anotherState"
states: # This should be an array
  - name: "start"
    text: "Welcome!"
    buttons:
      - - { text: "Custom Event", callback_data: "custom_event" }
  - name: "anotherState"
    text: "Another state text"
    buttons: []
`;

describe('MessageDispatcher', () => {
  let messageDispatcher;
  let mockScenarioHandlerInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs.readFileSync to return our mock YAML content
    require('fs').readFileSync.mockReturnValue(mockScenarioYAML);

    // Create a fresh ScenarioModule mock instance for each test
    // And mock its methods that are called by MessageDispatcher
    mockScenarioHandlerInstance = {
      customEventHandler: jest.fn((user, msg, callback) => callback({ setState: 'anotherState' })),
      anotherEventHandler: jest.fn(() => ({ setState: 'start' })),
      // Add other methods of ScenarioModule that might be called by MessageDispatcher
    };
    ScenarioModule.mockImplementation(() => mockScenarioHandlerInstance);
    
    // Mock User model methods (now User should be the result of the mocked mongoose.model)
    User.findOne.mockImplementation((query, callback) => {
      // Simulate finding a user or creating a new one
      if (query.id === 123) {
        const mockUserInstance = {
          id: 123,
          state: 'start',
          lastMessageId: 'initial_message_id_123', // Ensure lastMessageId is present
          save: jest.fn().mockResolvedValue(true),
          markModified: jest.fn(),
        };
        return callback(null, mockUserInstance);
      }
      if (query.id === 456) { // For the second callback test
         const mockUserInstance = {
          id: 456,
          state: 'anotherState',
          lastMessageId: 'initial_message_id_456', // Ensure lastMessageId is present
          save: jest.fn().mockResolvedValue(true),
          markModified: jest.fn(),
        };
        return callback(null, mockUserInstance);
      }
      return callback(null, null); // Simulate user not found
    });

    User.create.mockImplementation((newUserObj, callback) => {
      const mockUserInstance = {
        ...newUserObj,
        lastMessageId: null, // New users might not have a lastMessageId initially
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      return callback(null, mockUserInstance);
    });
    
    // Mock Message model constructor and save method
    // Message should also be the result of the mocked mongoose.model
    // If Message is used as a constructor: Message.mockImplementation(...)
    // If Message is used for static methods: Message.staticMethod.mockImplementation(...)
    // The mongoose.model mock's NewMockModel is a jest.fn(), so it's already a mock constructor.
    // We need to ensure its instances have a 'save' method, which is done in the NewMockModel mock.
    // So, direct Message.mockImplementation might not be needed if Message instances are created via `new Message()`.

    messageDispatcher = new MessageDispatcher(mockBot, mockScenarioHandlerInstance);
  });

  it('should register message and callback_query handlers on bot', () => {
    expect(mockBot.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockBot.on).toHaveBeenCalledWith('callback_query', expect.any(Function));
  });

  describe('messageHandler (text message)', () => {
    it('should process a text message and change user state if scenario dictates', async () => {
      // Simulate a 'message' event
      const messageHandlerFunc = mockBot.on.mock.calls.find(call => call[0] === 'message')[1];
      
      const mockMsg = {
        from: { id: 123, first_name: 'Test', last_name: 'User', username: 'testuser' },
        text: '/start', // Or any text that your scenario might handle
      };
      
      // This will need to be adjusted based on how your actual scenario.yaml and state handlers work.
      // For this example, let's assume 'start' state doesn't have a textExpected, so it just re-emits the message for 'start' state.
      
      await messageDispatcher.messageHandler(mockMsg);

      expect(User.findOne).toHaveBeenCalledWith({ id: 123 }, expect.any(Function));
      // Further assertions depend on the scenario.yaml and the state's definition.
      // For example, if 'start' state sends a message:
      expect(mockBot.sendMessage).toHaveBeenCalledWith(123, "Welcome!", expect.any(Object));
    });
  });

  describe('callbackHandler (button press)', () => {
    it('should process a callback query and call the appropriate handler function', async () => {
      // Simulate a 'callback_query' event
      const callbackHandlerFunc = mockBot.on.mock.calls.find(call => call[0] === 'callback_query')[1];
      
      const mockCallbackQuery = {
        id: 'query_id',
        from: { id: 123 },
        message: { message_id: 'orig_message_id', chat: { id: 123 } },
        data: 'custom_event', // This should match a dataHandler in mockScenarioYAML
      };

      await messageDispatcher.messageHandler(mockCallbackQuery); // messageHandler calls callbackHandler internally if msg.data exists

      expect(User.findOne).toHaveBeenCalledWith({ id: 123 }, expect.any(Function));
      expect(mockScenarioHandlerInstance.customEventHandler).toHaveBeenCalled();
      // Check if state was changed based on the handler's return
      // This requires the mock user object to be updated by changeUserState,
      // which involves more detailed mocking of user.save() and state transitions.
      // For simplicity here, we check if the bot was asked to update the message for the new state.
      expect(mockBot.editMessageText).toHaveBeenCalledWith("Another state text", expect.objectContaining({ chat_id: 123 }));
    });

     it('should handle callback data that directly sets state', async () => {
      const callbackHandlerFunc = mockBot.on.mock.calls.find(call => call[0] === 'callback_query')[1];
      const mockCallbackQuery = {
        id: 'query_id_2',
        from: { id: 456 }, // New user ID
        message: { message_id: 'orig_message_id_2', chat: { id: 456 } },
        data: 'go_start', // This should match a dataHandler in mockScenarioYAML that just sets state
      };
      
      // User.findOne will be handled by the general mock above for id 456
      await messageDispatcher.messageHandler(mockCallbackQuery);

      expect(User.findOne).toHaveBeenCalledWith({ id: 456 }, expect.any(Function));
      // Check that the message for the "start" state was sent/edited
      expect(mockBot.editMessageText).toHaveBeenCalledWith("Welcome!", expect.objectContaining({ chat_id: 456 }));
    });
  });

  // Add more tests for:
  // - User creation when a user is not found
  // - Different types of dataHandlers (with/without async, with/without setState in dataHandler itself)
  // - textExpected scenarios in dispatchMessage
  // - Error handling (e.g., if scenarioHandler function throws)
  // - updateLastMessageAccordingToState logic
  // - foreignEventReceiver (if important to test at this level)
});
