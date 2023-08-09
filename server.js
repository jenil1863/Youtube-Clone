const express = require("express");
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("assets"));

const exphbs = require("express-handlebars");
const { readFile, readFileSync } = require("fs");
const { partials } = require("handlebars");
const { url } = require("inspector");
app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      json: (context) => {
        return JSON.stringify(context);
      },
    },
  })
);
app.set("view engine", ".hbs");

/// --------------
// DATABASE : Connecting to database and setting up your schemas/models (tables)
/// --------------

const mongoose = require("mongoose");
const { title } = require("process");

mongoose.connect(
  "mongodb+srv://jenilshah1863:5sPWBSliufPTFXlI@cluster0.t1mq6kq.mongodb.net/?retryWrites=true&w=majority"
);

// TODO: Define schemas
// - VideoCollection
// - Comments
// ----------------

const Schema = mongoose.Schema;
const VideosCollectSchema = new Schema({
  videoId: String,
  title: String,
  channel: String,
  likes: Number,
  image: String,
  uploadDate: String,
});

const CommentsCollectSchema = new Schema({
  name: String,
  texts: String,
  videoId: String,
});

// TODO: Define models
// - VideoCollection
const Videos = mongoose.model("videos_collection", VideosCollectSchema);
// - CommentsCollection
const Comments = mongoose.model("comments_collection", CommentsCollectSchema);

// homepage endpoint to display all the videos
app.get("/", async (req, res) => {
  try {
    const videolist = await Videos.find().lean();

    let isEmpty = false;
    if (videolist.length === 0) {
      isEmpty = true;
    }

    res.render("partials/homepage", {
      layout: "primary",
      Vid: videolist,
      novideosFound: isEmpty,
    });
    return;
  } catch (err) {
    console.log(err);
  }
});


// code for the search bar with its parameters
app.post("/lookup", async (req, res) => {
  const VideosFromForm = req.body.VideoName;

  try {
    const videos = await Videos.findOne({ title: VideosFromForm }).lean();

    if (videos === null) {
      res.send("No videos found");
      return;
    }

    const videosAvailableList = await Videos.find({
      title: videos.title,
    }).lean();

    if (videosAvailableList.length === 0) {
      res.send("zero found");
      return;
    }

    res.render("partials/homepage", {
      layout: "primary",
      videoid: videos,
      videoid: videosAvailableList,
    });
  } catch (error) {
    console.log(error);
  }
});

// VidDetail endpoint for display the video details in "VidDetailPage"
app.get("/VidDetail/:id", async (req, res) => {
  const DetId = req.params.id;

  try {
    const VidDet = await Videos.findOne({ _id: DetId }).lean();
    if (!VidDet) {
      res.send("No video found");
      return;
    }
    res.render("partials/VidDetailPage", { layout: "primary", VidDet });
  } catch (error) {
    console.log(error);
  }
});

// code that allows you to comment and assign it to its respective video
app.post("/comment/:videoId", async (req, res) => {
  const videoId = req.params.videoId;
  const nameFromUI = req.body.name;
  const textsFromUI = req.body.texts;

  const specificId = await Videos.findOne({ videoId: videoId }).lean();

  if (specificId === null) {
    console.log("No Video found of you choice!");
  }
  // insert value into db
  const commentToAdd = new Comments({
    name: nameFromUI,
    texts: textsFromUI,
    videoId: videoId,
  });
  try {
    await commentToAdd.save();
   
    const commentList = await Comments.find({ videoId: videoId }).lean();
    const vd = await Videos.findOne({ videoId: videoId }).lean();

    res.render("partials/VidDetailPage", {
      layout: "primary",
      vd,
      commentList,
    });
  } catch (err) {
    console.log(err);
  }
});

// code to like video and increase like
app.post("/likes/:videoId", async (req, res) => {
  const videoId = req.params.videoId;

  // find the video with the given ID
  const likeId = await Videos.findOne({ videoId: videoId });

  if (!likeId) {
    console.log("No video found with that ID");
    return;
  }

  // increment the like count and save the updated video
  likeId.likes++;
  try {
    await likeId.save();

    const likeNumber = await Videos.findOneAndUpdate(likeId);

    res.render("partials/VidDetailPage", { layout: "primary", likeNumber });
    likeId.likes = videoId.likes;
  } catch (err) {
    console.log(err);
  }
});

// admin endpoint that allow you to interact with the adminpage
app.get("/admin", async (req, res) => {
  try {
    const videos = await Videos.find({}).lean();
    // Render the admin page with the video details
    res.render("partials/adminpage", { layout: "primary", videos });
  } catch (error) {
    console.error(error);
  }
});

// code that assigns delete to every video in adminpage.
app.post("/admin/delete/:videoId", async (req, res) => {
  try {
    const videoId = req.params.videoId;
    // delete the video and its associated comments
    await Videos.findByIdAndDelete(videoId);
    await Comments.deleteMany({ texts: videoId });
    // redirect to the admin page with the updated video list
    res.redirect("/admin");
  } catch (error) {
    console.log(error);
  }
});

// server reading and listening.
const onHttpStart = () => {
  console.log(`Express web server running on port: ${HTTP_PORT}`);
  console.log(`Press CTRL+C to exit`);
};
app.listen(HTTP_PORT, onHttpStart);

