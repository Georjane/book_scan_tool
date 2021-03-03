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
let percentageMatch = 0;

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
	await scanBook(wordsArray, res)
  // res.render('resultspage', { data: allBookWordsObject})

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
    percentageMatch = calculatePercentage(words, numberOfWordsFound)
    console.log('>>>>>>>>>>>>>> Percentage Match is ' + percentageMatch + '%');
    const unfoundWordsWithPartlyMatchedWords = partlyMatchedWords(wordsNotFound, dictionary)
    for (const word in allBookWordsObject) {
      for (const unfoundWord in unfoundWordsWithPartlyMatchedWords) {
          if (word == unfoundWord) {
            allUnfoundWordsObject[word] = {}
            allUnfoundWordsObject[word]['word_count'] = allBookWordsObject[word]['word_count']
            // allUnfoundWordsObject[word]['match-words'] = unfoundWordsWithPartlyMatchedWords[word]
          }
      }
    }
    wordsWithHighestPercentMatch(unfoundWordsWithPartlyMatchedWords, res)
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

const wordsWithHighestPercentMatch = async (unfoundWordsWithPartlyMatchedWords, res) => {
	let filteredUnfoundWords = {}
	for (const unfoundWord in unfoundWordsWithPartlyMatchedWords) {
		let subdata = {}
		let maxPercentMatchValue = findMaxPercentageMatch(unfoundWordsWithPartlyMatchedWords[unfoundWord])
		let maxPercentMatchWord = getKeyByValue(unfoundWordsWithPartlyMatchedWords[unfoundWord], maxPercentMatchValue)
		subdata['unfound_word'] = unfoundWord;
		subdata['matched_word'] = maxPercentMatchWord;
		subdata['percent'] = maxPercentMatchValue + '%';
	  subdata['word_id'] = findWordId(maxPercentMatchWord)
    // filteredUnfoundWords = subdata
    for (const wordNotFound in allUnfoundWordsObject) {
      if (unfoundWord == wordNotFound) {
        allUnfoundWordsObject[wordNotFound]['highest_match_word'] = maxPercentMatchWord;
        allUnfoundWordsObject[wordNotFound]['percent_match'] = maxPercentMatchValue + '%';
        allUnfoundWordsObject[wordNotFound]['word_id'] = findWordId(maxPercentMatchWord);
      }
    }
  }
  // console.log(filteredUnfoundWords);
    // console.log(allUnfoundWordsObject);

  findRootId(filteredUnfoundWords, res)

}

const findWordId = (maxPercentMatchWord) => {
	for (const word in wordAndId) {
		if (maxPercentMatchWord == wordAndId[word]['word']) {
			return wordAndId[word]['word_id']
		}
	}
}

const findRootId = (filteredUnfoundWords, res) => {
  let rootAndWordIdsObj = {};
  fs.createReadStream('word_roots_map.csv')
    .pipe(csv())
    .on('data', function (row) {
      rootAndWordIdsObj[row.word_id] = row.root_id
    })
    .on('end',async function () {
      let unfoundWordIdsArray = []
      let allWordIdsArray = []
      Object.values(allUnfoundWordsObject).map(element => {
        unfoundWordIdsArray.push(element['word_id'])
      });
      // unfoundWordIdsArray contains all unfound words ids
      allWordIdsArray = Object.keys(rootAndWordIdsObj)
      function filterWordIds(word_id,) {
        return unfoundWordIdsArray.includes(word_id);
      }
      let filteredUnfoundWordIds = allWordIdsArray.filter(filterWordIds);
      // filteredUnfoundWordIds Array contains only unfound words ids that have corresponding root_ids
      let filteredUnfoundWordAndRootIds = {}
      filteredUnfoundWordIds.map(word_id => {
        filteredUnfoundWordAndRootIds[word_id] = rootAndWordIdsObj[word_id]
      });
      // console.log(filteredUnfoundWordAndRootIds);
      // console.log(allUnfoundWordsObject);

      for (const word_id in filteredUnfoundWordAndRootIds) { 
        for (const wordNotFound in allUnfoundWordsObject) {
          if (word_id == allUnfoundWordsObject[wordNotFound]['word_id']) {
            allUnfoundWordsObject[wordNotFound]['root_id'] = filteredUnfoundWordAndRootIds[word_id]
          }
        }  
      }
      // console.log(allUnfoundWordsObject);
      findMeaningAndDescription(res)
      
    });
}

const findMeaningAndDescription = async (res, req) => {

	let objOfMeaningsOriginsDescs = {} // object containing word_id, root_id, meaning and description
	let rootIdMeaningDescObj = {}

	fs.createReadStream('roots.csv')
			.pipe(csv())
			.on('data', function (row) {
        for (const wordNotFound in allUnfoundWordsObject) {        
          if (row.root_id == allUnfoundWordsObject[wordNotFound]['root_id']) {
            // arrRootIdMeaningDesc.push(row.root_id, row.description, row.Meaning)
            allUnfoundWordsObject[wordNotFound]['description'] = row.description
            allUnfoundWordsObject[wordNotFound]['meaning'] = row.Meaning
          }  
        }
			})
			.on('end', async function () {
        // console.log(allUnfoundWordsObject);
				res.render('resultspage', { data: allUnfoundWordsObject, percentageMatch: percentageMatch});

			});  
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