// init project
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const shortId = require('shortid')

//mongoose
const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

//Middleware
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('public'))

//send Index
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//db stuff
var personSchema = new mongoose.Schema({
  shortId: {type: String, unique: true, default: shortId.generate},
  username: String,
  count: Number,
  exercise: [{
    description : String,
    duration: Number,
    date : {}
  }]
}, { usePushEach: true });

var Person = mongoose.model('Person', personSchema);

// add person
app.post('/api/exercise/new-user', (req, res, next) => {
  const username = req.body.username;
  if(username){
    const newUser = {username: username, exercise: []};
    Person.findOne({username : newUser.username}, (error, data) => {
      if (error) return next(error);
      if (data) {
        res.send("That username is already taken.");
      } else {
        Person.create(newUser, (error, user) => {
          if (error) return next(error);
          res.json({username: user.username, id: user._id});
        });
      }
    });
  } else {
    res.send("You need to provide a username.");
  }
});

// add exercise
app.post('/api/exercise/add', (req, res, next) => {

  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  const requiredFieldsCompleted = userId && description && duration;
  if(requiredFieldsCompleted){
    Person.findById(userId, (error, user) => {
      if(error) return next(error);
      if(user){    
        const date = (req.body.date) ? new Date(req.body.date) : new Date();
        user.count = user.count + 1;
        const newExercise = {description: description, duration: duration, date: date};
        user.exercise.push(newExercise);
        user.save((error, user) => {
          if(error) return next(error);
          const dataToShow = { 
            username: user.username,
            _id: user._id,
            description: description,
            duration: duration,
            date: date.toDateString()
          };
          res.json(dataToShow);
        });
      } else {
        next();
      }
    });
  } else {
    let message = "Please complete all the required fields.";
    res.send(message);
  }
});

//functions
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

// get userId
app.get("/api/exercise/log", (req, res) => {
  const userId=req.query.userId
  if(userId){
    let from = req.query.from;
    let to = req.query.to;
    let limit = Number(req.query.limit);
    
    Person.findById(userId, (err, data) => {
      if (err) return err
      
        if (data){
          const dataToShow = {id: data._id, username: data.username, count: data.count, exercise: data.exercise};
          if (from) dataToShow.from = from.toDateString();
          if (to) dataToShow.to = to.toDateString();
          let results = data.exercise;
          
          if (from && to) {
              results = results.filter((item) => (item.date >= from && item.date <= to));
            } else if (from) {
              results = results.filter((item) => (item.date >= from));
           } else if (to) {
             results = results.filter((item) => (item.date <= to));
           }
          res.json(dataToShow);
        } 

    }) // find 
  } // if  
}) // get


// get all users
app.get('/api/exercise/users',(req,res) => {
  
 Person.find({}).then(function (users) {
 res.send(users);
 });
});



// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
