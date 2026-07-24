require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const app = express()

app.get('/', (req,res)=>{
    res.json({'msg':"Welcome to the app"})
})


// connect to db
mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    app.listen(4000, ()=>{
    console.log("Listening to port 4000")
})
})
.catch((error)=>{
    console.log(error)
})



