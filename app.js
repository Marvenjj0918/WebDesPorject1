var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// new stuff starts here
var session = require('cookie-session');

// Flash is an extension of connect-flash with the ability to define a flash message and
// render it without redirecting the request
var flash = require('express-flash');
var env = require('dotenv').config();

const Client = require('pg').Client;
const client = (() => {
  if (process.env.NODE_ENV !== 'production') {
      return new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: false
      });
  } else {
      return new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: {
              rejectUnauthorized: false
            }
      });
  } })();

client.connect(); //connect to database

// javascript password encryption (https://www.npmjs.com/package/bcryptjs)
var bcrypt = require('bcryptjs');
//  authentication middleware
var passport = require('passport');
// authentication locally (not using passport-google, passport-twitter, passport-github...)
var LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
  usernameField: 'username', // form field
  passwordField: 'password'
  },
  function(username, password, done) {
  client.query('SELECT * FROM users WHERE username = $1', [username], function(err, result) {
    if (err) {
      console.log("SQL error"); //next(err);
      return done(null,false, {message: 'sql error'});
    }
    if (result.rows.length > 0) {
      var matched = bcrypt.compareSync(password, result.rows[0].password);
      if (matched) {
        console.log("Successful login, ", result.rows[0]);
        return done(null, result.rows[0]);
      }
    }
    console.log("Bad username or password");
    // returning to passport
    // message is passport key
    return done(null, false, {message: 'Bad username or password'});
  });
})
);

// Store user information into session
passport.serializeUser(function(user, done) {
  //return done(null, user.id);
  return done(null, user);
});

// Get user information out of session
passport.deserializeUser(function(id, done) {
  return done(null, id);
});

// Use the session middleware
// configure session object to handle cookie
// req.flash() requires sessions

app.set('trust proxy', 1)
app.use(session({
  secret: 'WebDev',
  resave:false,
  saveUninitialized: true,
  cookie: {
    secure: (process.env.NODE_ENV && process.env.NODE_ENV == 'production') ? true:false
  }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// new stuff ends here
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
