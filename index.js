require('dotenv').config()

// Initialize logging
require('./logging');

require('./mongoose');

// Initialize handling incoming messages module
require('./messageHandling/index');