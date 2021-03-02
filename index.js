const express = require('express')
const path = require("path") 
const multer = require('multer')
const fs = require('fs');
const pdf = require('pdf-parse');

const app = express();

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
  console.log(wordsToCount);
	// scanBook(wordsArray, res)
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

app.get("/",function(req,res){ 
  res.render("homepage"); 
})

app.listen(8080,function(error) { 
	if(error) throw error 
		console.log("Server created Successfully on PORT 8080") 
});