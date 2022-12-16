const mongoClient = require('mongodb').MongoClient;
const ServerApiVersion = require('mongodb').ServerApiVersion
require('dotenv').config();

const state = {
    db:null
}

module.exports.connect = function (done) {
    const url = "mongodb+srv://josepjoyal:"+process.env.MONGODB_CREDENTIAL+"@joyal.y1379a1.mongodb.net/?retryWrites=true&w=majority";
    const dbname = "shopping";

    mongoClient.connect(url,{useNewUrlParser : true, useUnifiedTopology : true,serverApi: ServerApiVersion.v1},(err,data)=>{
        if(err){
            console.log(err);
            return done(err);
        }
        state.db = data.db(dbname);
        done();
    });
};

module.exports.get = function(){
    return state.db
};


// const mongoClient = require('mongodb').MongoClient;
// const state = {
//     db:null
// }

// module.exports.connect = function (done) {
//     const url = 'mongodb://0.0.0.0:27017';
//     const dbname = 'shopping';

//     mongoClient.connect(url,{useNewUrlParser : true, useUnifiedTopology : true},(err,data)=>{
//         if(err){
//             return done(err);
//         }
//         state.db = data.db(dbname);
//         done();
//     });
// };

// module.exports.get = function(){
//     return state.db
// };


// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://josepjoyal:<password>@joyal.y1379a1.mongodb.net/?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });