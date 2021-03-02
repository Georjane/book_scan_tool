const obj = {
  'meet' : {
    'word_count': 20
  }
}
obj['meet']['root_word'] = 'a'
obj['meeting'] = {}

obj['meeting']['root_word'] = 'a'

obj['meeting']['word_count'] = 30

console.log(obj['meeting']);