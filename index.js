const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose")

const app = express();
const bcrypt = require("bcryptjs")
const saltRounds = 10;

const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const session = require("express-session")

const userSchema = require("./modules/userSchema")
const Token = require("./modules/token")
const sendEmail = require("./utils/sendEmail")
const passwordToken = require("./modules/passwordToken")

const crypto = require("crypto")

require('dotenv').config();

app.use(cors({credentials: true, origin: process.env.ORIGIN}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    key: process.env.KEY,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'Lista', // This needs to be unique per-host.
    // proxy: true, // Required for Heroku & Digital Ocean (regarding X-Forwarded-For)
    cookie: {
        secure: false, // required for cookies to work on HTTPS
        httpOnly: false,
        // sameSite: 'none',
      }

}))

mongoose.connect(process.env.DBHOST, 
    {
        useNewUrlParser: true,
    }
)

app.post("/register", async (req, res) => {
    const username = req.body.username
    const email = req.body.email
    const password = req.body.password

    let user = await userSchema.findOne({email: email})

    if (user) {
        res.send({existing: true})
    } else {
        try {
            bcrypt.genSalt(saltRounds, async (err, salt) => {
                if (err) {
                    console.log(err)
                }
                bcrypt.hash(password, salt, async (err, hash) => {
                    if (err) {
                        console.log(err)
                    }
                    const User = new userSchema({username: username, email: email, password: hash});
                    let user = await User.save()
                    
    
                    const token = new Token({
                        userId: user._id,
                        token: crypto.randomBytes(32).toString("hex") 
                    })
    
                    await token.save()
                    // const url = `${process.env.BASE_URL}users/${user._id}/verify/${token.token}`
                    const message = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <title>LISTA</title>
                    </head>
                    <body>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 60vh; background: #1D1D26; overflow: hidden;">
                            <tr>
                                <td margin: 0 auto; height: 100%; margin-top: 5rem;" align="center">
                                    <img src="https://unix-shop.s3.ap-southeast-1.amazonaws.com/lista/listalogo+2.png" alt="Logo" style="margin: 0 auto; width: 10rem; height: 4rem;"></img>
                                    <h1 style="font-family:'Courier New'; color: #FFFFFF; text-align: center; margin: 0; margin-top: 2rem;">Account activation: </h1> <br>
    
                                    <p style="font-family:'Courier New'; color: #FFFFFF; text-align: center; margin: 0; margin-top: -5rem">Please click the button below to activate your account.</p>
    
                                    <a href="${process.env.BASE_URL}users/${user._id}/verify/${token.token}" target="_blank" style="background: linear-gradient(75.2deg, #C344D7 34.89%, #E492C2 78.63%, #FFD0B1 116.92%); padding: 2.5rem 9rem; font-family: Tahoma, sans-serif; color: #FFFFFF; cursor: pointer; margin-top: 4rem; text-decoration: none; display: inline-block; text-align: center; font-weight: bold; font-size: 24px;">Activate your account</a>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    `
                    await sendEmail(user.email, "Verify email", message)
    
                    res.send({token: token.token})
                })
            })
            
        } catch (error) {
            console.log(error)
            res.send(error)
        }
    }

    
})

app.get("/:id/verify/:token", async (req, res) => {
    try {
        const user = await userSchema.findOne({_id: req.params.id})
        if (!user) return res.status(400).send({message: "Invalid link"})

        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token
        })
        if (!token) return res.status(400).send({message: "invalid link"})


        await userSchema.updateOne({_id: user._id}, {verified: true})
        await token.remove()

        res.status(200).send({message: "Email verified sucecssfuly"})
    } catch (error) {
        res.send(error)
    }
})

app.post("/login", async (req, res) => {
    const email = req.body.email
    const password = req.body.password

    const User = await userSchema.findOne({email: email})

    if (!User) {
        res.send({valid: false, message: "Invalid email or password!"})
    } else if (User.verified === false) {
        const oldToken = await Token.findOne({
            userId: User._id,
        })

        if (oldToken) {
            await oldToken.remove()
        }

        const token = new Token({
            userId: User._id,
            token: crypto.randomBytes(32).toString("hex") 
        })

        await token.save()
        // const url = `${process.env.BASE_URL}users/${user._id}/verify/${token.token}`
        const message = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>LISTA</title>
        </head>
        <body>
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 60vh; background: #1D1D26; overflow: hidden;">
                <tr>
                    <td margin: 0 auto; height: 100%; margin-top: 5rem;" align="center">
                        <img src="https://unix-shop.s3.ap-southeast-1.amazonaws.com/lista/listalogo+2.png" alt="Logo" style="margin: 0 auto; width: 10rem; height: 4rem;"></img>
                        <h1 style="font-family:'Courier New'; color: #FFFFFF; text-align: center; margin: 0; margin-top: 2rem;">Account activation: </h1> <br>

                        <p style="font-family:'Courier New'; color: #FFFFFF; text-align: center; margin: 0; margin-top: -5rem">Please click the button below to activate your account.</p>

                        <a href="${process.env.BASE_URL}users/${User._id}/verify/${token.token}" target="_blank" style="background: linear-gradient(75.2deg, #C344D7 34.89%, #E492C2 78.63%, #FFD0B1 116.92%); padding: 2.5rem 9rem; font-family: Tahoma, sans-serif; color: #FFFFFF; cursor: pointer; margin-top: 4rem; text-decoration: none; display: inline-block; text-align: center; font-weight: bold; font-size: 24px;">Activate your account</a>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `
        await sendEmail(User.email, "Verify email", message)
        res.send({valid: false, message: "We've sent a new verification link to your email. Please check your email inbox."})

    } else {
        bcrypt.compare(password, User.password, function(err, result) {
            if (err) {
                console.log(err)
            }

            if (result) {

                req.session.user = User

                var hour = 3600000
                req.session.user.expires = new Date(Date.now() + hour);
                req.session.user.maxAge = hour;

                res.send({loggedIn: true, message: "Login success."})
            } else {
                res.send({loggedIn: false, message: "Invalid email or password!"})
            }
        })
    }

})

app.post("/forgot", async (req, res) => {
    const email = req.body.email

    let user = await userSchema.findOne({email: email})

    if (!user) {
        res.send({valid: false, message: "Email address does not exist."})
    } else {

        const passToken = new passwordToken({
            userId: user._id,
            token: crypto.randomBytes(32).toString("hex") 
        })

        await passToken.save() 

        const message = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <title>LISTA</title>
                    </head>
                    <body>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 60vh; background: #1D1D26; overflow: hidden;">
                            <tr>
                                <td margin: 0 auto; height: 100%; margin-top: 5rem;" align="center">
                                    <img src="https://unix-shop.s3.ap-southeast-1.amazonaws.com/lista/listalogo+2.png" alt="Logo" style="margin: 0 auto; width: 10rem; height: 4rem;"></img>
                                    <h1 style="font-family:'Courier New'; color: #FFFFFF; text-align: center; margin: 0; margin-top: 2rem;">Password reset: </h1> <br>
    
                                    <p style="font-family:'Courier New'; color: #FFFFFF; text-align: center; margin: 0; margin-top: -5rem">Please don't forget your password next time.</p>
    
                                    <a href="${process.env.BASE_URL}users/${user._id}/forgot/${passToken.token}" target="_blank" style="background: linear-gradient(75.2deg, #C344D7 34.89%, #E492C2 78.63%, #FFD0B1 116.92%); padding: 2.5rem 9rem; font-family: Tahoma, sans-serif; color: #FFFFFF; cursor: pointer; margin-top: 4rem; text-decoration: none; display: inline-block; text-align: center; font-weight: bold; font-size: 24px;">Reset password</a>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    `
        await sendEmail(user.email, "Change password", message)

        res.send({token: passToken.token})
    }
})

app.get("/:id/checkValid/:token", async (req,res) => {
    try {
        const user = await userSchema.findOne({_id: req.params.id})
        if (!user) return res.status(400).send({message: "Invalid link"})

        const token = await passwordToken.findOne({
            userId: user._id,
            token: req.params.token
        })
        if (!token) return res.status(400).send({message: "invalid link"})

        res.status(200).send({message: "Reset password token is valid"})
    } catch (error) {
        res.send(error)
    }
})

app.post("/:id/forgot/:token", async (req, res) => {
    const newPassword = req.body.newPassword
    try {
        const user = await userSchema.findOne({_id: req.params.id})
        if (!user) return res.status(400).send({message: "Invalid link"})

        bcrypt.compare(newPassword, user.password, async function(err, result) {
            if (err) {
                console.log(err)
            }

            if (result) {
                return res.send({valid: false, message: "Your new password cannot be the same sa your current password."})
            } else {


                bcrypt.genSalt(saltRounds, async (err, salt) => {
                    if (err) {
                        console.log(err)
                    }
                    bcrypt.hash(newPassword, salt, async (err, hash) => {
                        if (err) {
                            console.log(err)
                        }

                        const token = await passwordToken.findOne({
                            userId: user._id,
                            token: req.params.token
                        })
                        if (!token) return res.status(400).send({message: "invalid link"})
                
                
                        await userSchema.updateOne({_id: user._id}, {password: hash})
                        
                        setTimeout(async () => {
                            await token.remove()
                        }, 2000);
                        
                
                        res.send({message: "Password change successful."})
                    })
                })
                

 
            }
        })


    } catch (error) {
        res.send(error)
    }
})


app.post('/logout', (req, res) => {
    if (req.session.user) {
        req.session.user = null
        req.session.destroy();
        res.send({out: true})

    } else {
        res.send({out: false})
    }
})

app.get("/login", (req, res) => {
    if (req.session.user) {
        res.send({loggedIn: true})
    } else {
        res.send({loggedIn: false})
    }
})

app.get("/", (req,res) => {
    res.send({Message: "Hello"})
})


app.listen(process.env.PORT || 3001, () => {
    console.log("Connected to PORT")
})