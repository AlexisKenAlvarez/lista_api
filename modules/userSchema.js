const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }, 
    password: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    }
})

const users = new mongoose.model("users", userSchema)
module.exports = users