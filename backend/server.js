require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors'); 
const app = express()



app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cors())

// connect to db
mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    app.listen(5000, ()=>{
    console.log("Listening to port 5000")
})
})
.catch((error)=>{
    console.log(error)
})



// API Endpoints
app.use('/leave-management',require('./routes/leave_management'))


