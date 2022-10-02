const nodemailer = require("nodemailer")
require('dotenv').config();

module.exports = async(email, subject, text) => {
        const transporter = nodemailer.createTransport({
            host: process.env.HOST,
            service: 'Sendinblue',
            post: 587,
            secure: process.env.SECURE,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            }


        })

        await new Promise((resolve, reject) => {
            // verify connection configuration
            transporter.verify(function (error, success) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    console.log("Server is ready to take our messages");
                    resolve(success);
                }
            });
        });

        const mailData = {
            from: process.env.USER,
            to: email,
            subject: subject,
            text: text
        };

        await new Promise((resolve, reject) => {
            // send mail
            transporter.sendMail(mailData, (err, info) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log(info);
                    resolve(info);
                }
            });
        });

        console.log("Email send sucessful")
        res.status(200).json({ status: "OK" });
    
}