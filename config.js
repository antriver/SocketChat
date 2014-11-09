var config = {

    log: {
        db: {
            server: 'localhost',
            name: 'chat',
            user: 'root',
            pass: 'root',
            table: 'messages',
        },

        // Flush messages to the database after this number of messages
        // or milliseconds, whichever comes first
        flushMessages: 10,
        flushSeconds: 30
    }

};

module.exports = config;
