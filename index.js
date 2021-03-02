const express = require('express')

const app = express();

let string = '<h1>Hello World</h1>'
app.get("/",function(req,res){ 
	res.send(string)
})

app.listen(8080,function(error) { 
	if(error) throw error 
		console.log("Server created Successfully on PORT 8080") 
});