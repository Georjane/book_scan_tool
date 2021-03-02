const express = require('express')
const path = require("path") 


const app = express();

app.use(express.static(__dirname+'/assets/images'));
app.set("views",path.join(__dirname,"views")) 
app.set("view engine","ejs")

app.get("/",function(req,res){ 
  res.render("homepage"); 
})

app.listen(8080,function(error) { 
	if(error) throw error 
		console.log("Server created Successfully on PORT 8080") 
});