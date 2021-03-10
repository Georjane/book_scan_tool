const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const csv = require('csv-parser');
const bodyParser = require('body-parser');

const allBookWordsObject = {};
const allUnfoundWordsObject = {};
const dictionary = [];
const wordsNotFound = [];
const arrayOfWordIds = [];
const wordAndId = {};
let percentageMatch = 0;

const groupWordsBycount = async (words) => {
  const wordsToCount = {};
  for (let i = 0; i < words.length; i += 1) {
    if (wordsToCount[(words[i]).toLowerCase()] === undefined) { wordsToCount[(words[i]).toLowerCase()] = 0; }
    wordsToCount[(words[i]).toLowerCase()] += 1;
  }
  return wordsToCount;
};

// const allBookWordsObject = {};

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

const scanBook = (words) => {
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
      return allUnfoundWordsObject
      // wordsWithHighestPercentMatch(unfoundWordsWithPartlyMatchedWords, res);
    });
};

onmessage = async function(e) {
  console.log('Worker: Message received from main script');
  const words = e.data

  const wordsToCount = await groupWordsBycount(words);
  const wordsArray = Object.keys(wordsToCount);
  for (const word in wordsToCount) {
    allBookWordsObject[word] = {};
    allBookWordsObject[word].word_count = wordsToCount[word];
  }

  // const workerResult = []
  // for (const word in allBookWordsObject) {
  //   workerResult.push(word, allBookWordsObject[word])
  // }
  const workerResult = scanBook(wordsArray)
  // let allUnfoundWordsObject = scanBook(wordsArray);

  // for (const word in allUnfoundWordsObject) {
  //   workerResult.push(word, allUnfoundWordsObject[word])
  // }

  // const workerResult = 'Result: ' + allBookWordsObject;
  console.log('Worker: Posting message back to main script');
  postMessage(workerResult);

}

