const groupWordsBycount = (words) => {
  const wordsToCount = {};
  for (let i = 0; i < words.length; i += 1) {
    if (wordsToCount[(words[i]).toLowerCase()] === undefined) { wordsToCount[(words[i]).toLowerCase()] = 0; }
    wordsToCount[(words[i]).toLowerCase()] += 1;
  }
  return wordsToCount;
};

let jane = ['one', 'two', 'three', 'one', 'two', 'two']

var promise = new Promise(function(resolve, reject) {
  
 resolve(groupWordsBycount(jane))
 reject('no')
});

promise.then((value) => {
  console.log(value) // "Stuff worked!"
})