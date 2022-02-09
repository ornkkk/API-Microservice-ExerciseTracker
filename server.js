const mongoose = require("mongoose");
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const { connectDB } = require("./db");

const User = require("./models/User");
const Exercise = require("./models/Exercise");

const dayjs = require("dayjs");
const durationPlugin = require("dayjs/plugin/duration");
const timezonePlugin = require("dayjs/plugin/timezone");
const utcPlugin = require("dayjs/plugin/utc");

dayjs.extend(utcPlugin);
dayjs.extend(timezonePlugin);
dayjs.extend(durationPlugin);

const run = async () => {
  await connectDB();

  app.use(cors());
  app.use(bodyParser({ extended: false }));
  app.use(express.static("public"));
  app.get("/", (_req, res) => {
    res.sendFile(__dirname + "/views/index.html");
  });

  app.post("/api/users", async (req, res) => {
    try {
      const username = req.body.username;
      if (!username) {
        throw new Error("Invalid username");
      }
      const newUser = await new User({ username }).save();
      res.json({
        _id: newUser.id,
        username: newUser.username,
      });
    } catch (err) {
      console.error(err);
      res.send(err);
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const users = await User.find({}, { username: 1 });
      res.json(
        users.map((i) => ({
          _id: i.id,
          username: i.username,
        }))
      );
    } catch (err) {
      console.error(err);
      res.send(err);
    }
  });

  app.post("/api/users/:_id/exercises", async (req, res) => {
    try {
      // console.log("body and param");
      // console.log(JSON.stringify(req.body, 0, 2));
      // console.log(JSON.stringify(req.params, 0, 2));
      if (!req.params["_id"]) throw new Error("Invalid ID");
      if (!req.body.description)
        throw new Error("Description missing or invalid");
      if (!req.body.duration && isNaN(Number(req.body.duration)))
        throw new Error("Duration missing or invalid");
      const user = await User.findOne(
        { _id: req.params["_id"] },
        { _id: 1, username: 1 }
      );
      if (!user) throw new Error("Invalid User");

      const newExercise = await new Exercise({
        _user: req.params["_id"],
        description: req.body.description,
        duration: Number(req.body.duration),
        date: req.body.date
          ? dayjs(req.body.date, "YYYY-MM-DD").toDate()
          : new Date(),
      }).save();

      // console.log("newExercise");
      // console.log(JSON.stringify(newExercise.toJSON(), 0, 2));

      const result = {
        _id: user.id,
        username: user.username,
        date: newExercise.date.toDateString(),
        duration: newExercise.duration,
        description: newExercise.description,
      };

      // console.log("result");
      // console.log(JSON.stringify(result, 0, 2));

      res.json(result);
    } catch (err) {
      console.error(err);
      res.send(err);
    }
  });

  app.get("/api/users/:_id/logs", async (req, res) => {
    try {
      console.log("body and param");
      console.log(JSON.stringify(req.query, 0, 2));
      console.log(JSON.stringify(req.params, 0, 2));
      const basePipeline = [
        {
          $match: {
            _user: mongoose.Types.ObjectId(req.params["_id"]),
          },
        },
      ];

      if (req.query.from && req.query.to) {
        const from = dayjs(req.query.from, "YYYY-MM-DD").toDate();
        const to = dayjs(req.query.to, "YYYY-MM-DD").toDate();

        basePipeline.push({
          $match: {
            date: {
              $gte: from,
              $lte: to,
            },
          },
        });
      }

      basePipeline.push({
        $sort: {
          _id: -1,
        },
      });

      if (req.query.limit) {
        basePipeline.push({
          $limit: Number(req.query.limit),
        });
      }

      const user = await User.findOne(
        { _id: req.params["_id"] },
        { _id: 1, username: 1 }
      );
      if (!user) throw new Error("Invalid User");

      const logs = await Exercise.aggregate(basePipeline).exec();

      res.json({
        _id: user.id,
        username: user.username,
        count: logs.length,
        log: logs.map((i) => {
          return {
            _id: i._id,
            description: i.description,
            duration: i.duration,
            date: i.date.toDateString(),
          };
        }),
      });
    } catch (err) {
      console.error(err);
      res.send(err);
    }
  });

  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
  });
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});