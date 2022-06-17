'use strict';

require('dotenv').config();
// const Knex = require('knex');
const crypto = require('crypto');
var multer = require('multer');
const fs = require('fs')
const path = require('path')
const google2TTS = require('node-google-tts-api');
const tts = new google2TTS();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const HttpStatus = require('http-status-codes');
// const jwt = require('./jwt');
const model = require('./model');

const app = express();

var db = require('knex')({
    client: 'mysql',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        port: +process.env.DB_PORT,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        insecureAuth: true
    }
});

// let checkAuth = (req, res, next) => {
//     let token = null;

//     if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
//         token = req.headers.authorization.split(' ')[1];
//     } else if (req.query && req.query.token) {
//         token = req.query.token;
//     } else {
//         token = req.body.token;
//     }

//     jwt.verify(token)
//         .then((decoded) => {
//             req.decoded = decoded;
//             next();
//         }, err => {
//             return res.send({
//                 ok: false,
//                 error: HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED),
//                 code: HttpStatus.UNAUTHORIZED
//             });
//         });
// }

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get('/', (req, res) => res.send({ ok: true, message: 'Welcome to my api serve!', code: HttpStatus.OK }));

app.get('/getsound/:text', async(req, res) => {
    // res.send('Hello World')
    var text = req.params.text;
    try {
        var filePath = path.join('./audio/');
        let rs = await model.getSound(db, text)
            // console.log(rs);
        if (rs.length == 1) {
            // res.send({ ok: true, rows: rs })
            filePath = `${filePath}${rs[0].id}.mp3`
            var stat = fs.statSync(filePath);
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Content-Length': stat.size
            });

            var readStream = fs.createReadStream(filePath);
            readStream.pipe(res)
        } else {
            var data = {
                sound_text: text
            };
            let save_data = await model.saveSound(db, data)

            tts.get({
                text: text,
                lang: "th"
            }).then((data) => {
                // returns mp3 audio src buffer
                filePath = `${filePath}${save_data}.mp3`
                fs.writeFileSync(filePath, data);
                // let read = fs.readFileSync("./audio.mp3");

                var stat = fs.statSync(filePath);

                res.writeHead(200, {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': stat.size
                });

                var readStream = fs.createReadStream(filePath);
                readStream.pipe(res)
            });
            // res.send({ ok: true, rows: save_data[0] })
        }

    } catch (error) {
        // Handle Error Here
        console.error(error);
    }
})

//error handlers
if (process.env.NODE_ENV === 'development') {
    app.use((err, req, res, next) => {
        console.log(err.stack);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: {
                ok: false,
                code: HttpStatus.INTERNAL_SERVER_ERROR,
                error: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
            }
        });
    });
}

app.use((req, res, next) => {
    res.status(HttpStatus.NOT_FOUND).json({
        error: {
            ok: false,
            code: HttpStatus.NOT_FOUND,
            error: HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
        }
    });
});

var port = +process.env.WWW_PORT || 3000;

app.listen(port, () => console.log(`Api listening on port ${port}!`));