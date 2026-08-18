require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors'); 
const app = express()
const cookieParser = require("cookie-parser")



app.use(cookieParser())
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))






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
app.use('/user',require('./routes/user'))
app.use("/attendance", require("./routes/attendance"))


