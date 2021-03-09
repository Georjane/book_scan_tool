onmessage = function(e) {
  console.log('Worker: Message received from main script');
  const result = e.data
  
    const workerResult = 'Result: ' + result;
    console.log('Worker: Posting message back to main script');
    postMessage(workerResult);

}

