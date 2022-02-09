const mongoose = require("mongoose");

const MONGO_CONNECTION_URL = process.env['MONGO_CONNECTION_URL']

module.exports = {
  connectDB: async function () {
    try {
      console.log(`MongoDB connecting...📶`);
      await mongoose.connect(MONGO_CONNECTION_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        //useCreateIndex: true,
      });
      console.log(`MongoDB connected...✅`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  },
};
