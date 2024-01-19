const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0vnziom.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run(){
try{
const appointmentOptionCollection = client.db('doctorsPortal').collection('appointmentOptions');
const bookingsCollection = client.db('doctorsPortal').collection('bookings');

app.get('/appointmentOptions', async(req, res)=>{
  const query = {};
  const result = await appointmentOptionCollection.find(query).toArray();
  res.send(result)
})

app.post('/bookings', async(req, res)=>{
  const bookings = req.body;
  const result = await bookingsCollection.insertOne(bookings);
  res.send(result);
})

} finally {
 
}
}

run().catch(console.log)


app.get('/', async (req, res) => {
  res.send('data send')
})

app.listen(port, () => {
  console.log('data send successfully')
})