const express = require('express');
const path = require('path');
const multer = require('multer');
// const fs = require('fs');
// const pdf = require('pdf-parse');
const bodyParser = require('body-parser');
// const Worker = require('web-worker');

// const myWorker = new Worker("worker.js");
const app = express();
// let allUnfoundWordsObject = {};
// let percentageMatch;
let scanid;

app.use(express.static(`${__dirname}/public`));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}.pdf`);
  },
});

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(`${'Error: File upload only supports the '
      + 'following filetypes - '}${filetypes}`);
  },
}).single('mybook');

app.post('/processpdfbook', async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.send(err);
    } else {
      scanid = Math.floor(Math.random() * 100);
      res.render('scanpage', { scanid });
    }
  });
});

app.get('/', (req, res) => {
  res.render('homepage');
});

app.listen(8080, (error) => {
  if (error) throw error;
  console.log('Server created Successfully on PORT 8080');
});