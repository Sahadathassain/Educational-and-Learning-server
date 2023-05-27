const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vwsamp9.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db('Education');
    const EducationCollection = db.collection('educations');
    console.log('Database connected');

    app.post('/Data', async (req, res) => {
      const body = req.body;
      body.price = parseFloat(body.price);

      const result = await EducationCollection.insertOne(body);
      console.log(result);
      res.send(result);
    });

    app.get('/allData', async (req, res) => {
      const result = await EducationCollection.find({}).toArray();
      res.send(result);
    });

    app.get('/allData/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await EducationCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error retrieving document:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.get('/myToys/:email', async (req, res) => {
      const { sort } = req.query;
      const query = { sellerEmail: req.params.email };
      let sortOption = {};

      if (sort === 'asc') {
        sortOption = { price: 1, _id: 1 };
      } else if (sort === 'desc') {
        sortOption = { price: -1, _id: -1 };
      }

      try {
        const toys = await EducationCollection.find(query).sort(sortOption).toArray();
        res.send(toys);
      } catch (error) {
        console.error('Failed to fetch toy data:', error);
        res.status(500).send('Failed to fetch toy data');
      }
    });

    app.post('/addtoy', async (req, res) => {
      try {
        const toyData = req.body;
        toyData.createdAt = new Date();
        toyData.price = parseFloat(toyData.price);

        const result = await EducationCollection.insertOne(toyData);
        if (result?.insertedId) {
          res.status(200).json({ message: 'Toy added successfully', status: true });
        } else {
          res.status(404).json({ message: 'Unable to add toy. Please try again later.', status: false });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add toy', status: false });
      }
    });

    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('SIMPLE CRUD IS RUNNING');
});

app.listen(port, () => {
  console.log(`SIMPLE CRUD is running on port ${port}`);
});
