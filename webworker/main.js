// import Worker from 'web-worker';
const Worker = require('web-worker');


const worker = new Worker('data:,postMessage("hello")');
worker.onmessage = e => console.log(e.data);  // "hello"