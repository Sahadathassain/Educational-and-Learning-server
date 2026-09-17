const express = require("express");
const cors = require("cors");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
  })
);

app.use(express.json());


/* =====================================================
   MONGODB CONNECTION
===================================================== */

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3qljnif.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


/* =====================================================
   DATABASE / COLLECTION
===================================================== */

let EducationCollection;


/* =====================================================
   DATABASE CONNECTION FUNCTION
===================================================== */

async function connectDB() {
  if (EducationCollection) {
    return EducationCollection;
  }

  await client.connect();

  const db = client.db("Education");

  EducationCollection = db.collection("educations");

  await client.db("admin").command({
    ping: 1,
  });

  console.log("MongoDB deployment ping successful");
  console.log("Database connected successfully");

  return EducationCollection;
}


/* =====================================================
   HELPERS
===================================================== */

const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};


const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};


/* =====================================================
   ROOT ROUTE
===================================================== */

app.get("/", async (req, res) => {
  try {
    await connectDB();

    res.status(200).send(
      "Educational & Learning API is running"
    );
  } catch (error) {
    console.error("Root route error:", error);

    res.status(500).json({
      message: "Server is running but database connection failed",
      status: false,
    });
  }
});


/* =====================================================
   CREATE DATA
   POST /Data
===================================================== */

app.post("/Data", async (req, res) => {
  try {
    const collection = await connectDB();

    const body = {
      ...req.body,
    };


    /* -------------------------------
       Required fields
    ------------------------------- */

    if (!body.toyName) {
      return res.status(400).json({
        message: "Toy name is required",
        status: false,
      });
    }


    if (!body.sellerEmail) {
      return res.status(400).json({
        message: "Seller email is required",
        status: false,
      });
    }


    /* -------------------------------
       Numeric fields
    ------------------------------- */

    const price = Number(body.price);

    const toyRating =
      body.toyRating !== undefined
        ? Number(body.toyRating)
        : undefined;

    const availableQuantity =
      body.availableQuantity !== undefined
        ? Number(body.availableQuantity)
        : undefined;


    if (Number.isNaN(price)) {
      return res.status(400).json({
        message: "Price must be a valid number",
        status: false,
      });
    }


    if (
      toyRating !== undefined &&
      Number.isNaN(toyRating)
    ) {
      return res.status(400).json({
        message: "Toy rating must be a valid number",
        status: false,
      });
    }


    if (
      availableQuantity !== undefined &&
      Number.isNaN(availableQuantity)
    ) {
      return res.status(400).json({
        message:
          "Available quantity must be a valid number",
        status: false,
      });
    }


    /* -------------------------------
       Normalize data
    ------------------------------- */

    body.toyName = body.toyName.trim();

    body.sellerEmail =
      body.sellerEmail.trim().toLowerCase();

    if (body.sellerName) {
      body.sellerName = body.sellerName.trim();
    }

    if (body.subCategory) {
      body.subCategory = body.subCategory.trim();
    }

    if (body.toyPhoto) {
      body.toyPhoto = body.toyPhoto.trim();
    }

    if (body.detailDescription) {
      body.detailDescription =
        body.detailDescription.trim();
    }


    body.price = price;

    if (toyRating !== undefined) {
      body.toyRating = toyRating;
    }

    if (availableQuantity !== undefined) {
      body.availableQuantity = availableQuantity;
    }

    body.createdAt = new Date();


    /* -------------------------------
       Insert
    ------------------------------- */

    const result =
      await collection.insertOne(body);


    res.status(201).json({
      message: "Data created successfully",
      status: true,
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error(
      "Failed to create data:",
      error
    );

    res.status(500).json({
      message: "Failed to create data",
      status: false,
    });
  }
});


/* =====================================================
   GET ALL DATA
   GET /allData
===================================================== */

app.get("/allData", async (req, res) => {
  try {
    const collection = await connectDB();

    const result =
      await collection
        .find({})
        .sort({
          createdAt: -1,
        })
        .toArray();

    res.status(200).json(result);

  } catch (error) {
    console.error(
      "Failed to fetch all data:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch data",
      status: false,
    });
  }
});


/* =====================================================
   GET SINGLE DATA
   GET /allData/:id
===================================================== */

app.get(
  "/allData/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid ID",
          status: false,
        });
      }


      const collection = await connectDB();


      const result =
        await collection.findOne({
          _id: new ObjectId(id),
        });


      if (!result) {
        return res.status(404).json({
          message: "Data not found",
          status: false,
        });
      }


      res.status(200).json(result);

    } catch (error) {
      console.error(
        "Error retrieving document:",
        error
      );

      res.status(500).json({
        message: "Internal Server Error",
        status: false,
      });
    }
  }
);


/* =====================================================
   SEARCH BY TEXT
   GET /alltoyByText/:text
===================================================== */

app.get(
  "/alltoyByText/:text",
  async (req, res) => {
    try {
      const text =
        decodeURIComponent(
          req.params.text || ""
        );


      if (!text.trim()) {
        return res.status(200).json([]);
      }


      const safeText =
        escapeRegex(text.trim());


      const collection =
        await connectDB();


      const result =
        await collection
          .find({
            $or: [
              {
                toyName: {
                  $regex: safeText,
                  $options: "i",
                },
              },
              {
                sellerName: {
                  $regex: safeText,
                  $options: "i",
                },
              },
              {
                subCategory: {
                  $regex: safeText,
                  $options: "i",
                },
              },
            ],
          })
          .sort({
            createdAt: -1,
          })
          .toArray();


      res.status(200).json(result);

    } catch (error) {
      console.error(
        "Search failed:",
        error
      );

      res.status(500).json({
        message: "Search failed",
        status: false,
      });
    }
  }
);


/* =====================================================
   GET MY TOYS
   GET /myToys/:email
===================================================== */

app.get(
  "/myToys/:email",
  async (req, res) => {
    try {
      const email =
        decodeURIComponent(
          req.params.email
        )
          .trim()
          .toLowerCase();


      if (!email) {
        return res.status(400).json({
          message: "Email is required",
          status: false,
        });
      }


      const collection =
        await connectDB();


      const { sort } = req.query;


      const query = {
        sellerEmail: email,
      };


      let sortOption = {
        createdAt: -1,
      };


      if (sort === "asc") {
        sortOption = {
          price: 1,
          _id: 1,
        };
      }


      if (sort === "desc") {
        sortOption = {
          price: -1,
          _id: -1,
        };
      }


      const toys =
        await collection
          .find(query)
          .sort(sortOption)
          .toArray();


      res.status(200).json(toys);

    } catch (error) {
      console.error(
        "Failed to fetch toy data:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch toy data",
        status: false,
      });
    }
  }
);


/* =====================================================
   ADD TOY
   POST /addtoy
===================================================== */

app.post(
  "/addtoy",
  async (req, res) => {
    try {
      const collection =
        await connectDB();


      const toyData = {
        ...req.body,
      };


      /* -------------------------------
         Required fields
      ------------------------------- */

      if (!toyData.toyName) {
        return res.status(400).json({
          message: "Toy name is required",
          status: false,
        });
      }


      if (!toyData.sellerEmail) {
        return res.status(400).json({
          message: "Seller email is required",
          status: false,
        });
      }


      /* -------------------------------
         Numeric fields
      ------------------------------- */

      const price =
        Number(toyData.price);

      const rating =
        Number(toyData.toyRating);

      const quantity =
        Number(toyData.availableQuantity);


      if (Number.isNaN(price)) {
        return res.status(400).json({
          message:
            "Price must be a valid number",
          status: false,
        });
      }


      if (Number.isNaN(rating)) {
        return res.status(400).json({
          message:
            "Rating must be a valid number",
          status: false,
        });
      }


      if (Number.isNaN(quantity)) {
        return res.status(400).json({
          message:
            "Available quantity must be a valid number",
          status: false,
        });
      }


      /* -------------------------------
         Normalize
      ------------------------------- */

      toyData.toyName =
        toyData.toyName.trim();

      toyData.sellerEmail =
        toyData.sellerEmail
          .trim()
          .toLowerCase();

      if (toyData.sellerName) {
        toyData.sellerName =
          toyData.sellerName.trim();
      }

      if (toyData.subCategory) {
        toyData.subCategory =
          toyData.subCategory.trim();
      }

      if (toyData.toyPhoto) {
        toyData.toyPhoto =
          toyData.toyPhoto.trim();
      }

      if (toyData.detailDescription) {
        toyData.detailDescription =
          toyData.detailDescription.trim();
      }


      toyData.price = price;

      toyData.toyRating = rating;

      toyData.availableQuantity =
        quantity;

      toyData.createdAt =
        new Date();


      /* -------------------------------
         Insert
      ------------------------------- */

      const result =
        await collection.insertOne(
          toyData
        );


      if (result?.insertedId) {
        return res.status(201).json({
          message: "Toy added successfully",
          status: true,
          insertedId:
            result.insertedId,
        });
      }


      return res.status(400).json({
        message:
          "Unable to add toy. Please try again later.",
        status: false,
      });

    } catch (error) {
      console.error(
        "Failed to add toy:",
        error
      );

      res.status(500).json({
        message: "Failed to add toy",
        status: false,
      });
    }
  }
);


/* =====================================================
   UPDATE TOY
   PATCH /updateToy/:id
===================================================== */

app.patch(
  "/updateToy/:id",
  async (req, res) => {
    try {
      const { id } = req.params;


      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid toy ID",
          status: false,
        });
      }


      const {
        price,
        toyRating,
        availableQuantity,
      } = req.body;


      const numericPrice =
        Number(price);

      const numericRating =
        Number(toyRating);

      const numericQuantity =
        Number(availableQuantity);


      if (Number.isNaN(numericPrice)) {
        return res.status(400).json({
          message:
            "Price must be a valid number",
          status: false,
        });
      }


      if (Number.isNaN(numericRating)) {
        return res.status(400).json({
          message:
            "Rating must be a valid number",
          status: false,
        });
      }


      if (
        Number.isNaN(numericQuantity)
      ) {
        return res.status(400).json({
          message:
            "Available quantity must be a valid number",
          status: false,
        });
      }


      const collection =
        await connectDB();


      const filter = {
        _id: new ObjectId(id),
      };


      const updateDoc = {
        $set: {
          price: numericPrice,

          toyRating:
            numericRating,

          availableQuantity:
            numericQuantity,

          updatedAt: new Date(),
        },
      };


      const result =
        await collection.updateOne(
          filter,
          updateDoc
        );


      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "Toy not found",
          status: false,
        });
      }


      res.status(200).json({
        message:
          "Toy updated successfully",
        status: true,
        modifiedCount:
          result.modifiedCount,
      });

    } catch (error) {
      console.error(
        "Failed to update toy:",
        error
      );

      res.status(500).json({
        message: "Failed to update toy",
        status: false,
      });
    }
  }
);


/* =====================================================
   DELETE TOY
   DELETE /myToys/:id
===================================================== */

app.delete(
  "/myToys/:id",
  async (req, res) => {
    try {
      const { id } = req.params;


      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid toy ID",
          status: false,
        });
      }


      const collection =
        await connectDB();


      const result =
        await collection.deleteOne({
          _id: new ObjectId(id),
        });


      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Toy not found",
          status: false,
        });
      }


      res.status(200).json({
        message:
          "Toy deleted successfully",
        status: true,
      });

    } catch (error) {
      console.error(
        "Error deleting document:",
        error
      );

      res.status(500).json({
        message: "Internal Server Error",
        status: false,
      });
    }
  }
);


/* =====================================================
   404 ROUTE
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    status: false,
  });
});


/* =====================================================
   LOCAL DEVELOPMENT
===================================================== */

if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `Educational & Learning server is running on port ${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        "MongoDB connection failed:",
        error
      );

      process.exit(1);
    });
}


/* =====================================================
   VERCEL
===================================================== */

module.exports = app;


/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

process.on("SIGINT", async () => {
  try {
    await client.close();

    console.log(
      "MongoDB connection closed."
    );
  } catch (error) {
    console.error(
      "Error closing MongoDB:",
      error
    );
  }

  process.exit(0);
});


process.on("SIGTERM", async () => {
  try {
    await client.close();

    console.log(
      "MongoDB connection closed."
    );
  } catch (error) {
    console.error(
      "Error closing MongoDB:",
      error
    );
  }

  process.exit(0);
});