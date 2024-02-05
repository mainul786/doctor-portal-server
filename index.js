const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.send(401).send('unAuthorization access')
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbiden Access' })
    }
    req.decoded = decoded;
    next();
  })

}

async function run() {
  try {
    const appointmentOptionCollection = client.db('doctorsPortal').collection('appointmentOptions');
    const bookingsCollection = client.db('doctorsPortal').collection('bookings');
    const usersCollection = client.db('doctorsPortal').collection('users');
    const doctorsCollection = client.db('doctorsPortal').collection('doctor');

    //Note:--  make sure you use verifyAdmin after verifyJWT
    const verifyAdmin = async (req, res, next)=>{
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbiden Access' })
      }
      next()
    }



    app.get('/appointmentOptions', async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();
      const bookingQuery = { appontmentDate: date }
      const allBooked = await bookingsCollection.find(bookingQuery).toArray();
      options.forEach(option => {
        const optionBooked = allBooked.filter(book => book.tretment === option.name);
        const bookedSlot = optionBooked.map(book => book.slot);
        const remaningSlots = option.slots.filter(slot => !bookedSlot.includes(slot));
        option.slots = remaningSlots;

      })
      res.send(options)
    })

    app.get('/appointmentSpecility', async (req, res) => {
      const query = {};
      const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray();
      res.send(result);
    })

    app.get('/bookings', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const booking = await bookingsCollection.find(query).toArray();
      res.send(booking);
    })

    app.get('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    })

    app.post('/bookings', async (req, res) => {
      const bookings = req.body;
      const query = {
        appontmentDate: bookings.appontmentDate,
        email: bookings.email,
        tretment: bookings.tretment
      }
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You have already a booing on ${bookings.appontmentDate}`;
        return res.send({ acknowledged: false, message })
      }
      const result = await bookingsCollection.insertOne(bookings);
      res.send(result);
    })


    app.post('/create-payment-intent', async(req, res)=>{
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;
      
      const paymentIntent = await stripe.paymentIntents.create({
        currency:'inr',
        amount:amount,
        "payment_method_type":[
          "card"
        ]
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
        return res.send({ accessToken: token });
      }
      res.status(401).send({ accessToken: '' })
    })

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' })
    })

    app.get('/users', async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
      
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    })

// Temporary for data update all collection data
// app.put('/addPrice', async (req, res)=>{
//   const filter = {};
//   const options = {upsert: true};
//   const updateDoc = {
//     $set: {
//       price: 99
//     }
//   }
//   const result = await appointmentOptionCollection.updateMany(filter, updateDoc, options);
//   console.log(result);
//   res.send(result)
// })

    app.post('/doctors', verifyJWT,verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorsCollection.insertOne(doctor);
      res.send({
        message: 'doctor inserted seccefully',
        status: 'success',
        data: result
      })
    })

    app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
      const doctors = {};
      const result = await doctorsCollection.find(doctors).toArray();
      res.send(result);
    })
    app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await doctorsCollection.deleteOne(query);
      res.send({
        message: 'Deleted succefully',
        status: 'success',
        data: result
      })
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