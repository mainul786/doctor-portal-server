const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');


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

function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.send(401).send('unAuthorization access')
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
    if(err){
      return res.status(403).send({message: 'Forbiden Access'})
    }
    req.decoded = decoded;
    next();
  })

}

async function run(){
try{
const appointmentOptionCollection = client.db('doctorsPortal').collection('appointmentOptions');
const bookingsCollection = client.db('doctorsPortal').collection('bookings');
const usersCollection = client.db('doctorsPortal').collection('users');

app.get('/appointmentOptions', async(req, res)=>{
  const date = req.query.date;
  const query = {};
  const options = await appointmentOptionCollection.find(query).toArray();
  const bookingQuery = {appontmentDate: date}
  const allBooked = await bookingsCollection.find(bookingQuery).toArray();
  options.forEach(option =>{
    const optionBooked = allBooked.filter(book => book.tretment === option.name);
    const bookedSlot = optionBooked.map(book => book.slot);
    const remaningSlots = option.slots.filter(slot => !bookedSlot.includes(slot));
    option.slots = remaningSlots;
    
  })
  res.send(options)
})

app.get('/bookings', verifyJWT, async(req, res)=>{
  const email = req.query.email;
  const decodedEmail = req.decoded.email;
  if(email !== decodedEmail){
    return res.status(403).send({message:'forbidden access'})
  }
  const query = {email: email};
  const booking = await bookingsCollection.find(query).toArray();
  res.send(booking);
})

app.post('/bookings', async(req, res)=>{
  const bookings = req.body;
  const result = await bookingsCollection.insertOne(bookings);
  res.send(result);
})

app.get('/jwt', async(req, res)=>{
  const email = req.query.email;
  const query = {email: email};
  const user = await usersCollection.findOne(query);
  if(user){
    const token = jwt.sign({email},process.env.ACCESS_TOKEN, {expiresIn: '1h'});
    return res.send({accessToken:token});
  }
  res.status(401).send({accessToken: ''})
})

app.post('/users', async(req, res)=>{
  const user = req.body;
  const result = await usersCollection.insertOne(user);
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