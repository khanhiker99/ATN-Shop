var express = require('express')

var hbs = require('hbs')

var app = express()
const path = require("path")
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
const multer = require("multer")
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }))
app.set('view engine','hbs')
var image = require('path').join(__dirname,'/image');
app.use(express.static(image));
// var url = 'mongodb://localhost:27017';
var MongoClient = require('mongodb').MongoClient;
var role;
const uri = "mongodb+srv://admin:admin@cluster0.5pyxt.mongodb.net/ATNShop?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.post('/update',async (req,res)=>{
    if (role === 'ADMIN') {
        let id = req.body.txtId;
        let code = req.body.txtCode;
        let nameInput = req.body.txtName;
        let priceInput = req.body.txtPrice;
        let description = req.body.txtDesc;
        let fileName = req.body.txtFileName;
        let newValues;
        if (fileName !== null && fileName !== undefined && fileName.length !== 0) {
            newValues = {
                $set: {
                    name: nameInput,
                    price: +priceInput,
                    code: code,
                    description: description,
                    fileName: fileName
                }
            };
        } else {
            newValues = {$set: {name: nameInput, price: +priceInput, code: code, description: description}};
        }

        var ObjectID = require('mongodb').ObjectID;
        let condition = {"_id": ObjectID(id)};

        await client.connect(async (err) => {
            const collection = client.db("ATNShop").collection("product");
            await collection.updateOne(condition, newValues);
            res.redirect('/home');
        });
    } else {
        res.render('Unauthorized');
    }
})

app.get('/edit',async (req,res)=>{
    if (role === 'ADMIN') {
        let id = req.query.id;
        let fileName = req.query.fileName;
        var ObjectID = require('mongodb').ObjectID;
        let condition = {"_id": ObjectID(id)};

        await client.connect(async (err) => {
            const collection = client.db("ATNShop").collection("product");
            if (fileName) {
                let newValues = {$set: {fileName: fileName}};
                await collection.updateOne(condition, newValues);
            }
            let productToEdit = await collection.findOne(condition);
            res.render('edit', {product: productToEdit})
        });
    }  else {
        res.render('Unauthorized');
    }

});

app.get('/view/:id',async (req,res)=>{
    let id = req.params.id;
    let fileName = req.query.fileName;
    var ObjectID = require('mongodb').ObjectID;
    let condition = {"_id" : ObjectID(id)};
    await client.connect(async () => {
        const collection = client.db("ATNShop").collection("product");
        if (fileName) {
            let newValues ={$set : {fileName: fileName}};
            await collection.updateOne(condition,newValues);
        }
        // perform actions on the collection object
        let productToEdit = await collection.findOne(condition);
        res.render('detail',{product:productToEdit})
    });
});

app.get('/delete',async (req,res)=>{
    if (role === 'ADMIN') {
        let id = req.query.id;
        var ObjectID = require('mongodb').ObjectID;
        let condition = {"_id": ObjectID(id)};

        await client.connect(async () => {
            const collection = client.db("ATNShop").collection("product");
            // perform actions on the collection object
            await collection.deleteOne(condition);
            res.redirect('/home');
        });
    } else {
        res.render('Unauthorized');
    }
})

app.post('/search',async (req,res)=>{
    let nameInput = req.body.txtName;
    let color = req.body.color;
    let price = req.body.price;
    let searchCondition = new RegExp(nameInput,'i') // search by text contains in name of product

    await client.connect(async (err) => {
        const collection = client.db("ATNShop").collection("product");
        let results;
        let condition;
        if (color && color !== 'all') {
             condition = {name:searchCondition, color: color};
        } else {
             condition = {name: searchCondition};
        }
        if (price && price !== 'all') {
            if (price === '1') { // if price is 1 level we will build a query to search price from 10000 to 99999
                condition.price = {$gte: 10000, $lte: 99999}
            } else if (price === '2') {
                condition.price = {$gte: 100000, $lte: 999999}
            } else if (price === '3') {
                condition.price = {$gte: 1000000, $lte: 9999999}
            } else {
                condition.price = {$gte: 10000000}
            }
        }
        console.log(condition);
        // perform actions on the collection object
        results = await collection.find(condition).toArray();
        if (role === 'ADMIN') {
            res.render('home',{model:results})
        } else if (role === 'USER') {
            res.render('homeUser',{model:results})
        }
    });
})

app.get('/homeUser',async (req,res)=>{
    await client.connect(async (err) => {
        const collection = client.db("ATNShop").collection("product");
        let results = await collection.find({}).toArray();
        // perform actions on the collection object
        res.render('homeUser', {model: results})
    });

})

app.get('/home',async (req,res)=>{
    if (role === 'ADMIN') { // if is Admin has permission to do this
        await client.connect(async (err) => {
            const collection = client.db("ATNShop").collection("product");
            let results = await collection.find({}).toArray();
            // perform actions on the collection object
            res.render('home', {model: results})
        });
    } else {
        res.render('Unauthorized');
    }

})

app.get('/',async (req,res)=>{
    await client.connect(async (err) => {
        const collection = client.db("ATNShop").collection("product");
        let results = await collection.find({}).toArray();
        // perform actions on the collection object
        res.render('index', {model: results})
    });

})

app.get('/register',async (req,res)=>{
        res.render('register');
})

app.post('/doLogin',async (req,res)=>{
    let username = req.body.username;
    let password = req.body.password;
    let condition = {"username": username.trim(), "password": password.trim()};
    await client.connect(async (err) => {
        const collection = client.db("ATNShop").collection("user");
        let result = await collection.findOne(condition);
        // perform actions on the collection object
        console.log(result)
        if (result && result._id) {
            if (result.role && result.role.includes('ADMIN')) {
                role = 'ADMIN';
                res.redirect('/home')
            } else {
                role = 'USER';
                res.redirect('/homeUser')
            }
        } else {
            res.send("Wrong username or password!")
        }
    });

})

app.get('/insert',(req,res)=>{
    res.render('newProduct')
})

app.get('/logout',(req,res)=>{
    role = undefined;
    res.redirect('/')
});

app.post('/doInsert', async (req,res)=>{
    if (role === 'ADMIN') {
        var nameInput = req.body.txtName;
        var priceInput = req.body.txtPrice;
        var code = req.body.txtCode;
        var description = req.body.txtDesc;
        var fileName = req.body.txtFileName;
        var color = req.body.color;
        console.log(color);
        var newProduct = {
            color: color,
            name: nameInput,
            price: +priceInput,
            code: code,
            description: description,
            fileName: fileName
        };
        await client.connect(err => {
            const collection = client.db("ATNShop").collection("product");
            collection.insertOne(newProduct);
            res.redirect('/home')
        });
    } else {
        res.render('Unauthorized');
    }
})

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "image")
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + "-" + Date.now()+".jpg") // set name of image again
    }
  })

const maxSize = 1 * 1000 * 1000;
    var nameOfFile;
var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb){

        // Set the filetypes, it is optional
        var filetypes = /jpeg|jpg|png/;
        var mimetype = filetypes.test(file.mimetype);

        var extname = filetypes.test(path.extname(
                    file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        nameOfFile = extname;
        cb("Error: File upload only supports the "
                + "following filetypes - " + filetypes);
      }

}).single("fileUpload");

app.post("/upload/:id",function (req, res, next) {
    if (role === 'ADMIN') {
        var id = req.params.id;

        upload(req, res, function (err) {
            if (!req.file) {
                res.send("please choose image!")
            } else {
                if (err) {
                    res.send(err)
                } else {
                    var newFileName = req.file.filename;
                    if (!id || id === "empty") {
                        res.render('newProduct', {product: {fileName: newFileName}})
                    } else {
                        res.redirect('/edit?id=' + id + '&fileName=' + newFileName);
                    }
                }
            }
        })
    } else {
        res.render('Unauthorized');
    }
})

// Take any port number of your choice which
// is not taken by any other process

app.listen(3000);
console.log('Server is running at 3000')
