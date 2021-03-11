const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
// const pdf = require('pdf-parse');
const bodyParser = require('body-parser');
// const Worker = require('web-worker');
const { v4: uuidv4 } = require('uuid');

let scanid;
// const myWorker = new Worker("worker.js");
const app = express();
// let allUnfoundWordsObject = {};
// let percentageMatch;

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
    cb(null, uuidv4());
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
      scanid = req.file.filename;
      const scanData = {
        status: 'not_started',
        upload_timestamp: Date.now(),
        book_name: req.file.originalname,
      };
      fs.writeFile(`scans/${scanid}.json`, JSON.stringify(scanData), (err) => {
        if (err) {
          throw err;
        }
      });
      res.render('scanpage', { scanid });
    }
  });
});

const groupWordsBycount = (words) => {
  const wordsToCount = {};
  for (let i = 0; i < words.length; i += 1) {
    if (wordsToCount[(words[i]).toLowerCase()] === undefined) { wordsToCount[(words[i]).toLowerCase()] = 0; }
    wordsToCount[(words[i]).toLowerCase()] += 1;
  }
  return wordsToCount;
};

let jane = ['one', 'two', 'three', 'one', 'two', 'two']

app.get('/scans/', (req, res) => {
  res.render('status', { scanid });

  app.get(`/scans/${scanid}`, (req, res) => {
    // hello = {'hello': 'hello' }
    // fs.writeFile('scans/' + scanid + '.json', JSON.stringify(hello), (err) => {
    //   if (err) {
    //       throw err;
    //   }
    // });

    
    var promise = new Promise(function(resolve, reject) {
      
     resolve(groupWordsBycount(jane))
     reject('no')
    });
    
    promise.then((value) => {
      console.log(value) // "Stuff worked!"
      fs.writeFile('scans/' + scanid + '.json', JSON.stringify(value), (err) => {
        if (err) {
            throw err;
        }
      });
      fs.readFile(`scans/${scanid}.json`, 'utf-8', (err, value) => {
        if (err) {
          throw err;
        }
        const datascan = JSON.parse(value.toString());
        res.send(datascan)
        // res.render('scans', {
        //   scanid,
        //   status: datascan.status,
        //   bookname: datascan.book_name,
        //   timestamp: datascan.upload_timestamp,
        // });
      });
    })
    
  });
});

app.get('/', (req, res) => {
  res.render('homepage');
});

app.listen(8080, (error) => {
  if (error) throw error;
  console.log('Server created Successfully on PORT 8080');
});