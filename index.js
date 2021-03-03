const express = require('express')
const path = require("path") 
const multer = require('multer')
const fs = require('fs');
const pdf = require('pdf-parse');
const csv = require('csv-parser');


const app = express();
const allBookWordsObject = {}
const allUnfoundWordsObject = {}
const dictionary = [];
const wordsNotFound = [];
const arrayOfWordIds = [];
const wordAndId = {}

app.set("views",path.join(__dirname,"views")) 
app.set("view engine","ejs")

var storage = multer.diskStorage({ 
	destination: function (req, file, cb) {  
		cb(null, "uploads") 
	}, 
	filename: function (req, file, cb) { 
		cb(null, file.fieldname +".pdf") 
	} 
})  

var upload = multer({ 
	storage: storage, 
	fileFilter: function (req, file, cb){
		var filetypes = /pdf/; 
		var mimetype = filetypes.test(file.mimetype);
		var extname = filetypes.test(path.extname(file.originalname).toLowerCase()); 		
		if (mimetype && extname) { 
			return cb(null, true); 
		} 	
		cb("Error: File upload only supports the "
				+ "following filetypes - " + filetypes); 
	}
}).single("mybook");

app.post("/processpdfbook", async (req, res, next) => {
	upload(req,res,function(err) {
		if(err) { 
			res.send(err);
		} else {
			// return scan id in progress while waiting for processPDF to complete
			processPDF(res);
		}
	});
}) 

const processPDF = async (res) => {
	let words = await convertPdfToTxt('uploads/mybook.pdf');
	let wordsToCount = await groupWordsBycount(words);
	const wordsArray = Object.keys(wordsToCount)
  for (const word in wordsToCount) {
    allBookWordsObject[word] = {}
    allBookWordsObject[word]['word_count'] = wordsToCount[word]
  }
	scanBook(wordsArray, res)
  res.render('resultspage', { data: allBookWordsObject})

}

const scanBook = (words, res) => {
	fs.createReadStream('words.csv')
  .pipe(csv())
  .on('data', function (row) {
    let eachWord = {};
    eachWord['word'] = row.word;
    eachWord['word_id'] = row.word_id;
    wordAndId[row.word] = eachWord
  })
  .on('end', function () {
		for (const word in wordAndId) {
      dictionary.push(wordAndId[word]['word'])
      arrayOfWordIds.push(wordAndId[word]['word_id'])
    }

    const numberOfWordsFound = containsWord(words, dictionary);
    const percentageMatch = calculatePercentage(words, numberOfWordsFound)
    console.log('>>>>>>>>>>>>>> Percentage Match is ' + percentageMatch + '%');
    const unfoundWordsWithPartlyMatchedWords = partlyMatchedWords(wordsNotFound, dictionary)
    // console.log(unfoundWordsWithPartlyMatchedWords);
// suppose to do this instead for the highest matching words already
    for (const word in allBookWordsObject) {
      for (const unfoundWord in unfoundWordsWithPartlyMatchedWords) {
          if (word == unfoundWord) {
            allUnfoundWordsObject[word] = {}
            allUnfoundWordsObject[word]['word_count'] = allBookWordsObject[word]['word_count']
            allUnfoundWordsObject[word]['match-words'] = unfoundWordsWithPartlyMatchedWords[word]
          }
      }
    }
    // console.log(allUnfoundWordsObject);
		let results = wordsWithHighestPercentMatch(unfoundWordsWithPartlyMatchedWords, res)
		// console.log(results);
		// res.render('resultspage', { data: results, percent: percentageMatch });
  });
}

const containsWord = (words, dictionary) => {
  let numberOfWordsFound = 0;
  words.map(word => {
    if (dictionary.includes(word)) {
      numberOfWordsFound += 1
    } else {
      wordsNotFound.push(word)
    }
  });
  return numberOfWordsFound
}

const calculatePercentage = (words, numberOfWordsFound) => {
  return Math.round((numberOfWordsFound/words.length)*100)
}


const convertPdfToTxt = async (uploadedBookPath) => {
	let dataBuffer = fs.readFileSync(uploadedBookPath); 
	let words = [];
	await pdf(dataBuffer).then( (data) => {
		words = data.text.replace(/[^a-zA-Z ]/g, "").split(' ');
	});
	return words;
};

const groupWordsBycount = async (words) => {
	let wordsToCount = {};
	for(let i = 0; i < words.length; i=i+1) {
		if(wordsToCount[(words[i]).toLowerCase()] == undefined) 
		wordsToCount[(words[i]).toLowerCase()] = 0;
		wordsToCount[(words[i]).toLowerCase()]++;
	}  
	return wordsToCount;
};

const partlyMatchedWords = (words, dictionary) => {
  let unfoundWordsWithPartlyMatchedWords = {};
  words.map(parentWord => {
  let subhash = {}
    dictionary.map(childWord => {
      let regexChildWord = new RegExp(escapeRegExp(childWord));
      if (regexChildWord.test(parentWord)) {
				// subhash['word'] = childWord
        subhash[childWord] = wordPercentageMatch(childWord, parentWord)
      }
    });
    unfoundWordsWithPartlyMatchedWords[parentWord] = subhash
  });
	return unfoundWordsWithPartlyMatchedWords
}

const wordPercentageMatch = (childWord, parentWord) => {
  // return (Math.round((childWord.length/parentWord.length)*100) + '%')
  return (Math.round((childWord.length/parentWord.length)*100))
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

const findMaxPercentageMatch = (object) => {
	let percentValuesArray = Object.values(object);
	return Math.max(...percentValuesArray);
}

const wordsWithHighestPercentMatch = (unfoundWordsWithPartlyMatchedWords, res) => {
	let filteredUnfoundWords = {}
	for (const unfoundWord in unfoundWordsWithPartlyMatchedWords) {
		let subdata = {}
		let maxPercentMatchValue = findMaxPercentageMatch(unfoundWordsWithPartlyMatchedWords[unfoundWord])
		let maxPercentMatchWord = getKeyByValue(unfoundWordsWithPartlyMatchedWords[unfoundWord], maxPercentMatchValue)
		subdata['unfound_word'] = unfoundWord;
		subdata['matched_word'] = maxPercentMatchWord;
		subdata['percent'] = maxPercentMatchValue + '%';
	  // // subdata['word_id'] = findWordId(maxPercentMatchWord)
    for (const wordNotFound in allUnfoundWordsObject) {
      if (unfoundWord == wordNotFound) {
        allUnfoundWordsObject[wordNotFound]['highest_match_word'] = maxPercentMatchWord;
        allUnfoundWordsObject[wordNotFound]['percent_match'] = maxPercentMatchValue + '%';
      }
    }
  }
  // console.log(filteredUnfoundWords);
    console.log(allUnfoundWordsObject);

  // findRootId(filteredUnfoundWords, res)
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

app.get("/",function(req,res){ 
  res.render("homepage"); 
})

app.listen(8080,function(error) { 
	if(error) throw error 
		console.log("Server created Successfully on PORT 8080") 
});