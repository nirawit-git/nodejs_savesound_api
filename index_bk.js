'use strict';

require('dotenv').config();
const Knex = require('knex');
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
const fse = require('fs-extra');
const jwt = require('./jwt');
const model = require('./model');



const app = express();

const uploadDir = process.env.UPLOAD_DIR || './uploaded';

fse.ensureDirSync(uploadDir);

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

var upload = multer({ storage: storage });

// var upload = multer({ dest: process.env.UPLOAD_DIR || './uploaded' });

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

let checkAuth = (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    } else {
        token = req.body.token;
    }

    jwt.verify(token)
        .then((decoded) => {
            req.decoded = decoded;
            next();
        }, err => {
            return res.send({
                ok: false,
                error: HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED),
                code: HttpStatus.UNAUTHORIZED
            });
        });
}

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

// app.post('/upload', upload.single('file'), (req, res) => {
//     console.log(req.body);
//     console.log(req.file);
//     res.send({ ok: true, message: 'File uploaded!', code: HttpStatus.OK });
// });

// app.post('/login', async(req, res) => {
//     var username = req.body.username;
//     var password = req.body.password;

//     if (username && password) {
//         var encPassword = crypto.createHash('md5').update(password).digest('hex');

//         try {
//             var rs = await model.doLogin(db, username, encPassword);
//             if (rs.length) {
//                 var token = jwt.sign({ username: username });
//                 res.send({ ok: true, token: token });
//             } else {
//                 res.send({ ok: false, error: 'Invalid username or password!', code: HttpStatus.UNAUTHORIZED });
//             }
//         } catch (error) {
//             console.log(error);
//             res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
//         }

//     } else {
//         res.send({ ok: false, error: 'Invalid data!', code: HttpStatus.INTERNAL_SERVER_ERROR });
//     }

// });

// app.get('/users', checkAuth, async(req, res, next) => {
//     try {
//         var rs = await model.getList(db);
//         res.send({ ok: true, rows: rs });
//     } catch (error) {
//         console.log(error);
//         res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
//     }
// });

// app.post('/users', checkAuth, async(req, res, next) => {
//     try {
//         var username = req.body.username;
//         var password = req.body.password;
//         var fullname = req.body.fullname;
//         var email = req.body.email;

//         if (username && password && email && fullname) {
//             var encPassword = crypto.createHash('md5').update(password).digest('hex');
//             var data = {
//                 username: username,
//                 password: encPassword,
//                 fullname: fullname,
//                 email: email
//             };
//             var rs = await model.save(db, data);
//             res.send({ ok: true, id: rs[0] });
//         } else {
//             res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
//         }
//     } catch (error) {
//         console.log(error);
//         res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
//     }
// });

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