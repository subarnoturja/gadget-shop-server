const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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

const { MongoClient, ServerApiVersion } = require('mongodb');
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