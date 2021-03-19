const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const bodyParser = require('body-parser');
// const Worker = require('web-worker');	
const { v4: uuidv4 } = require('uuid');
const validateUuid = require('uuid-validate');

// const myWorker = new Worker("worker.js");
const app = express();
// let allUnfoundWordsObject = {};
let percentageMatch;
let scanid;
let scanids = [];

app.use(express.static(__dirname+'/public')); 
app.set("views",path.join(__dirname,"views")) 
app.set("view engine","ejs") 
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
    cb(`${'Error: File upload only supports the '
      + 'following filetypes - '}${filetypes}`);
  },
}).single('mybook');

const convertPdfToTxt = async (uploadedBookPath) => {
  const dataBuffer = fs.readFileSync(uploadedBookPath);
  let words = [];
  await pdf(dataBuffer).then((data) => {
    let pdfText = data.text.replace(/[\n\r]/g, ' ').replace(/[-—]/g, ' ').replace(/[^a-zA-Z ]/g, '').split(' ');
    var filtered = pdfText.filter(function (el) {
      return el != '' && el.length > 3;
      // return el != '';
    });
    words = filtered
  });
  // console.log(words);
  return words;
};

const groupWordsBycount = async (words) => {
  const wordsToCount = {};
  for (let i = 0; i < words.length; i += 1) {
    if (wordsToCount[(words[i]).toLowerCase()] === undefined) { wordsToCount[(words[i]).toLowerCase()] = 0; }
    wordsToCount[(words[i]).toLowerCase()] += 1;
  }
  return wordsToCount;
}

function filterWord(word) {
  if (word.length > 4){
    return word
  }
}

const processPDF = async (res, scanid) => {
  const words = await convertPdfToTxt('uploads/' + scanid);
  const filterWords = words.filter(filterWord)
  const wordsToCount = await groupWordsBycount(filterWords);
  // console.log(wordsToCount);
  return wordsToCount
  // myWorker.postMessage(words);
};

app.post('/processpdfbook', async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.send(err);
    } else {
        scanid = req.file.filename;
      
        const promise1 = new Promise((resolve, reject) => {
          resolve(processPDF(res, scanid));
        })

        promise1.then((value) => {
        // console.log(value);
         res.render('resultspage', { object: value })

      });
      // res.render('words')
      // allUnfoundWordsObject = {}
      // scanid = req.file.filename;
      // let bookName = req.file.originalname
      // scanids.push({'scanid': scanid, 'bookName': bookName})
      // const scanData = {
      //   status: 'in-progress',
      //   upload_timestamp: (new Date(Date.now())).toLocaleString(),
      //   book_name: req.file.originalname,
      // };
      // fs.writeFile(`scans/${scanid}.json`, JSON.stringify(scanData), (err) => {
      //   if (err) {
      //     throw err;
      //   }
      // });
      // res.render('scanpage');


      // const promise1 = new Promise((resolve, reject) => {
      //   resolve(processPDF(res, scanid));
      // });
      
      // promise1.then((value) => {
      //   console.log('>>>>>>>>>> Done processing');
      // });
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