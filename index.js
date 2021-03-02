const express = require('express')
const path = require("path") 
const multer = require('multer')

const app = express();

app.set("views",path.join(__dirname,"views")) 
app.set("view engine","ejs")

var upload = multer({ 
	// storage: storage, 
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
			res.next(err);
		} else {
			// return scan id in progress while waiting for processPDF to complete
			// processPDF(res);
		}
	});
}) 

app.get("/",function(req,res){ 
  res.render("homepage"); 
})

app.listen(8080,function(error) { 
	if(error) throw error 
		console.log("Server created Successfully on PORT 8080") 
});