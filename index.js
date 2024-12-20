const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  }
))
app.use(express.json())

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixbaqca.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('gadgetShop').collection("users");
    const productCollection = client.db('gadgetShop').collection("products");

    // Token Verification
    const verifyJWT = (req, res, next) => {
      const authorization = req.headers.authorization;
      if(!authorization){
        return res.send({message: "No Token"})
      }
      const token = authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (err, decoded) => {
        if(err){
          return res.send({ message: "Invalid Token" })
        }
        req.decoded= decoded;
        next();
      })
    };

    // Verify Seller
    const verifySeller = async(req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query)
      if(user?.role !== "seller"){
        return res.send({ message: "Forbidden access" })
      }
      next();
    }

    // Insert User 
    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);

      if(existingUser){
        return res.send({ message: "user already exists "})
      }

      const result = await userCollection.insertOne(user)
      res.send(result)
    } )

    // Get User
    app.get('/user/:email', async(req, res) => {
      const query = { email : req.params.email }
      const user = await userCollection.findOne(query)
      res.send(user)
    })

    // Add Products
    app.post('/add-products', verifyJWT, verifySeller, async(req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result)
    })

    // Get Products
    app.get('/all-products', async (req, res) => {

      const { title, sort, category, brand, page = 1, limit = 9 } = req.query

      const query = {} 

      if(title){
        query.title = {$regex: title, $options: 'i'};
      }

      if(category){
        query.category = {$regex: title, $options: 'i'};
      }

      if(brand) {
        query.brand = brand;
      }

      const pageNumber = Number(page)
      const limitNumber = Number(limit)

      const sortOption = sort === 'asc' ? 1 : -1

      const products = await productCollection
      .find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .sort({ price: sortOption })
      .toArray();

      const totalProducts = await productCollection.countDocuments(query);

      const categories = [...new Set(products.map((product) => product.category))]
      const brands = [...new Set(products.map((product) => product.brand))]

      res.json({products, brands, categories, totalProducts});

    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// API
app.get("/", (req, res) => {
    res.send("Gadget Shop server is running")
})

// JWT
app.post('/authentication', async(req, res) => {
  const userEmail = req.body 
  const token = jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, {expiresIn: '10d'});
  res.send({ token })
})

app.listen(port, () => {
    console.log(`This server is running on port: ${port}`)
})