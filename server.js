const express = require("express");
// const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const expressLayouts = require('express-ejs-layouts');
const path = require("path");
const port = process.env.PORT || 8000;

const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.json());
// app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
// app.set('layout', 'layouts/layout');

// const passport = require("./middleware/passport");
// const authRoute = require("./routes/authRoute");
const userRoute = require("./routes/userRoute");
const userActRoute = require("./routes/userActRoute");
const userBatchRoute = require("./routes/userBatchRoute");
const adminRoute = require("./routes/adminRoute");
const agentRoute = require("./routes/agentRoute");
const mapRoute = require("./routes/mapRoute");
const miscRoute = require("./routes/miscRoute");


// Middleware for express
// app.use(passport.initialize());
// app.use(passport.session());

// app.use((req, res, next) => {
//   console.log(`User details are: `);
//   console.log(req.user);

//   console.log("Entire session object:");
//   console.log(req.session);

//   console.log(`Session details are: `);
//   console.log(req.session.passport);
//   next();
// });

app.use("/user", userRoute);
app.use("/user-by-act", userActRoute);
app.use("/userBatch", userBatchRoute)
app.use("/admin", adminRoute);
app.use("/agent", agentRoute);
app.use("/map", mapRoute);
app.use("/misc", miscRoute);


app.get('/', async (req, res) => {
  // const id = (await UserData.getBasic('Fish','4484')).puuid
  // console.log(await db.check_player(id))

  res.redirect('/user/lookup')
})

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server has started on port ${port}`);
});


