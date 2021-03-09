const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const csv = require('csv-parser');
const bodyParser = require('body-parser');


const app = express();
const allBookWordsObject = {};
const allUnfoundWordsObject = {};
const dictionary = [];
const wordsNotFound = [];
const arrayOfWordIds = [];
const wordAndId = {};
let percentageMatch = 0;
let scanid = 1;

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
    cb(`${'Error: File upload only supports the '
      + 'following filetypes - '}${filetypes}`);
  },
}).single('mybook');

const scanBook = (words, res) => {
  fs.createReadStream('words.csv')
    .pipe(csv())
    .on('data', (row) => {
      const eachWord = {};
      eachWord.word = row.word;
      eachWord.word_id = row.word_id;
      wordAndId[row.word] = eachWord;
    })
    .on('end', () => {
      for (const word in wordAndId) {
        dictionary.push(wordAndId[word].word);
        arrayOfWordIds.push(wordAndId[word].word_id);
      }
      const numberOfWordsFound = containsWord(words, dictionary);
      percentageMatch = calculatePercentage(words, numberOfWordsFound);
      const unfoundWordsWithPartlyMatchedWords = partlyMatchedWords(wordsNotFound, dictionary);
      for (const word in allBookWordsObject) {
        for (const unfoundWord in unfoundWordsWithPartlyMatchedWords) {
          if (word === unfoundWord) {
            allUnfoundWordsObject[word] = {};
            allUnfoundWordsObject[word].word_count = allBookWordsObject[word].word_count;
            // allUnfoundWordsObject[word]['match-words'] = unfoundWordsWithPartlyMatchedWords[word]
          }
        }
      }
      wordsWithHighestPercentMatch(unfoundWordsWithPartlyMatchedWords, res);
    });
};

const containsWord = (words, dictionary) => {
  let numberOfWordsFound = 0;
  words.map(word => {
    if (dictionary.includes(word)) {
      numberOfWordsFound += 1;
    } else {
      wordsNotFound.push(word);
    }
  });
  return numberOfWordsFound;
};

const calculatePercentage = (words, numberOfWordsFound) => Math.round((numberOfWordsFound / words.length) * 100);

const convertPdfToTxt = async (uploadedBookPath) => {
  const dataBuffer = fs.readFileSync(uploadedBookPath);
  let words = [];
  await pdf(dataBuffer).then((data) => {
    words = data.text.replace(/[^a-zA-Z ]/g, '').split(' ');
  });
  return words;
};

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

const findMaxPercentageMatch = (object) => {
  const percentValuesArray = Object.values(object);
  return Math.max(...percentValuesArray);
};

const findMeaningAndDescription = async (res, req) => {
  fs.createReadStream('roots.csv')
    .pipe(csv())
    .on('data', (row) => {
      for (const wordNotFound in allUnfoundWordsObject) {
        if (row.root_id === allUnfoundWordsObject[wordNotFound].root_id) {
          allUnfoundWordsObject[wordNotFound].description = row.description;
          allUnfoundWordsObject[wordNotFound].meaning = row.Meaning;
        }
      }
    })
    .on('end', async () => {
      for (const unfoundword in allUnfoundWordsObject) {
        delete allUnfoundWordsObject[unfoundword].word_id;
        delete allUnfoundWordsObject[unfoundword].root_id;
      }
      // res.render('resultspage', { data: allUnfoundWordsObject, percentageMatch });
    });
};

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

const groupWordsBycount = async (words) => {
  const wordsToCount = {};
  for (let i = 0; i < words.length; i += 1) {
    if (wordsToCount[(words[i]).toLowerCase()] === undefined) { wordsToCount[(words[i]).toLowerCase()] = 0; }
    wordsToCount[(words[i]).toLowerCase()] += 1;
  }
  return wordsToCount;
};

const partlyMatchedWords = (words, dictionary) => {
  const unfoundWordsWithPartlyMatchedWords = {};
  words.map(parentWord => {
    const subhash = {};
    dictionary.map(childWord => {
      const regexChildWord = new RegExp(escapeRegExp(childWord));
      if (regexChildWord.test(parentWord)) {
        subhash[childWord] = wordPercentageMatch(childWord, parentWord);
      }
      subhash
    });
    unfoundWordsWithPartlyMatchedWords[parentWord] = subhash;
  });
  return unfoundWordsWithPartlyMatchedWords;
};

const wordPercentageMatch = (word, parent) => (Math.round((word.length / parent.length) * 100));

const findWordId = (maxPercentMatchWord) => {
  for (const word in wordAndId) {
    if (maxPercentMatchWord === wordAndId[word].word) {
      return wordAndId[word].word_id;
    }
  }
};

const findRootId = (res) => {
  const rootAndWordIdsObj = {};
  fs.createReadStream('word_roots_map.csv')
    .pipe(csv())
    .on('data', (row) => {
      rootAndWordIdsObj[row.word_id] = row.root_id;
    })
    .on('end', async () => {
      const unfoundWordIdsArray = [];
      let allWordIdsArray = [];
      Object.values(allUnfoundWordsObject).map(element => {
        unfoundWordIdsArray.push(element.word_id);
      });
      // unfoundWordIdsArray contains all unfound words ids
      allWordIdsArray = Object.keys(rootAndWordIdsObj);
      function filterWordIds(word_id) {
        return unfoundWordIdsArray.includes(word_id);
      }
      const filteredUnfoundWordIds = allWordIdsArray.filter(filterWordIds);
      // filteredUnfoundWordIds Array contains only unfound words ids that have corresponding root_ids
      const filteredUnfoundWordAndRootIds = {};
      filteredUnfoundWordIds.map(word_id => {
        filteredUnfoundWordAndRootIds[word_id] = rootAndWordIdsObj[word_id];
      });
      for (const word_id in filteredUnfoundWordAndRootIds) {
        for (const wordNotFound in allUnfoundWordsObject) {
          if (word_id === allUnfoundWordsObject[wordNotFound].word_id) {
            allUnfoundWordsObject[wordNotFound].root_id = filteredUnfoundWordAndRootIds[word_id];
          }
        }
      }
      findMeaningAndDescription(res);
    });
};

const wordsWithHighestPercentMatch = async (unfoundWordsWithPartlyMatchedWords, res) => {
  for (const unfoundWord in unfoundWordsWithPartlyMatchedWords) {
    const maxPercentMatchValue = findMaxPercentageMatch(unfoundWordsWithPartlyMatchedWords[unfoundWord]);
    const maxPercentMatchWord = getKeyByValue(unfoundWordsWithPartlyMatchedWords[unfoundWord], maxPercentMatchValue);
    for (const wordNotFound in allUnfoundWordsObject) {
      if (unfoundWord === wordNotFound) {
        allUnfoundWordsObject[wordNotFound].highest_match_word = maxPercentMatchWord;
        allUnfoundWordsObject[wordNotFound].percent_match = `${maxPercentMatchValue}%`;
        allUnfoundWordsObject[wordNotFound].word_id = findWordId(maxPercentMatchWord);
      }
    }
  }
  findRootId(res);
};

const processPDF = async (res) => {
  const words = await convertPdfToTxt('uploads/mybook.pdf');
  const wordsToCount = await groupWordsBycount(words);
  const wordsArray = Object.keys(wordsToCount);
  for (const word in wordsToCount) {
    allBookWordsObject[word] = {};
    allBookWordsObject[word].word_count = wordsToCount[word];
  }
  scanBook(wordsArray, res);
};

app.post('/processpdfbook', async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      // res.send(err);
      scanid = -1
      res.render('scanpage', {scanid: scanid});
    } else {
      // scanid = Math.floor(Math.random() * 100);
      scanid = 1
      res.render('scanpage', {scanid: scanid});
      processPDF(res)
    }
  });
});

app.get('/', (req, res) => {
  res.render('homepage');
});

app.get('/scans/' + scanid, (req, res) => {
  const scanData = JSON.stringify(allUnfoundWordsObject);
  fs.writeFile('scans/scanid.json', scanData, (err) => {
    if (err) {
        throw err;
    }
    console.log("JSON data is saved.");
  });

  fs.readFile('scans/scanid.json', 'utf-8', (err, data) => {
    if (err) {
        throw err;
    }  
    // parse JSON object
    const datascan = JSON.parse(data.toString());
    res.render('resultspage', { data: datascan, percentageMatch });

  });
});

app.listen(8080, (error) => {
  if (error) throw error;
  console.log('Server created Successfully on PORT 8080');
});