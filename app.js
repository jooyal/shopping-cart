var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var hbs = require('express-handlebars');
var fileUpload = require('express-fileUpload');
var db = require('./config/connection.js');
var session = require('express-session');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:(__dirname+'/views/layout/'),partialsDir:(__dirname+'/views/partials/'),helpers: {
  inc: function (value, options) {
      return parseInt(value) + 1;
    }
}}));

app.use(logger('dev'));
app.use(express.json());//This middleware parse for json files that come with request, which enables us to use methods like req.body
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({secret:"Key",cookie:{maxAge:600000}}))
app.use(function(req, res, next) { 
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');//to clear cache, to avoid going to cached login page after hitting back button after logging in.
  next(); });
db.connect((err,done)=>{
  if(err) {
    console.log('Connection Error! '+ err);
  } else {
    console.log('Database connected successfully to mongodb Atlas.')
  }
});

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
