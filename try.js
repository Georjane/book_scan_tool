let obj = {
  'realtime': {
    'word_count': 2,
    'match-words': { 'real': 50, 'me': 25, '': 0, 'time': 50, 'alt': 38, 're': 25 },
    'highest_match_word': 'real',
    'percent_match': '50%',
    'word_id': '2305'
  },
  'meetings': {
    'word_count': 2,
    'match-words': { 'meet': 50, 'meeting': 88, 'in': 25, 'me': 25, '': 0, 's': 13 },
    'highest_match_word': 'meeting',
    'percent_match': '88%',
    'word_id': '7037'
  }
}

Object.values(obj).forEach(element => {
  console.log(element['word_id']);
});

// console.log(Object.values(obj)['word_id']);