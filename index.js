const express = require("express");
const cors = require("cors");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

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
    credentials: true,
  })
);

app.use(express.json());

// =====================================================
// MONGODB CONNECTION
// =====================================================

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3qljnif.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};

const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// =====================================================
// DATABASE
// =====================================================

async function run() {
  try {
    // ---------------------------------------------------
    // CONNECT DATABASE
    // ---------------------------------------------------

    await client.connect();

    const db = client.db("Education");

    const EducationCollection =
      db.collection("educations");

    // ---------------------------------------------------
    // DATABASE PING
    // ---------------------------------------------------

    await client.db("admin").command({
      ping: 1,
    });

    console.log(
      "MongoDB deployment ping successful"
    );

    console.log(
      "Database connected successfully"
    );

    // ===================================================
    // ROOT ROUTE
    // ===================================================

    app.get("/", (req, res) => {
      res.status(200).send(
        "Educational & Learning API is running"
      );
    });

    // ===================================================
    // CREATE DATA
    // ===================================================

    app.post("/Data", async (req, res) => {
      try {
        const body = {
          ...req.body,
        };

        // -------------------------------
        // Validate required fields
        // -------------------------------

        if (!body.toyName) {
          return res.status(400).json({
            message: "Toy name is required",
          });
        }

        if (!body.sellerEmail) {
          return res.status(400).json({
            message: "Seller email is required",
          });
        }

        // -------------------------------
        // Convert numeric values
        // -------------------------------

        const price = Number(body.price);

        const toyRating = Number(
          body.toyRating
        );

        const availableQuantity = Number(
          body.availableQuantity
        );

        if (Number.isNaN(price)) {
          return res.status(400).json({
            message: "Price must be a valid number",
          });
        }

        if (
          body.toyRating !== undefined &&
          Number.isNaN(toyRating)
        ) {
          return res.status(400).json({
            message:
              "Toy rating must be a valid number",
          });
        }

        if (
          body.availableQuantity !== undefined &&
          Number.isNaN(availableQuantity)
        ) {
          return res.status(400).json({
            message:
              "Available quantity must be a valid number",
          });
        }

        body.price = price;

        if (body.toyRating !== undefined) {
          body.toyRating = toyRating;
        }

        if (
          body.availableQuantity !== undefined
        ) {
          body.availableQuantity =
            availableQuantity;
        }

        body.createdAt = new Date();

        // -------------------------------
        // Insert
        // -------------------------------

        const result =
          await EducationCollection.insertOne(
            body
          );

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

    // ===================================================
    // GET ALL DATA
    // ===================================================

    app.get("/allData", async (req, res) => {
      try {
        const result =
          await EducationCollection.find({})
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
        });
      }
    });

    // ===================================================
    // GET SINGLE DATA
    // ===================================================

    app.get(
      "/allData/:id",
      async (req, res) => {
        try {
          const { id } = req.params;

          // -------------------------------
          // Validate ID
          // -------------------------------

          if (!isValidObjectId(id)) {
            return res.status(400).json({
              message: "Invalid ID",
            });
          }

          const query = {
            _id: new ObjectId(id),
          };

          const result =
            await EducationCollection.findOne(
              query
            );

          if (!result) {
            return res.status(404).json({
              message: "Data not found",
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
          });
        }
      }
    );

    // ===================================================
    // SEARCH BY TEXT
    // ===================================================

    app.get(
      "/alltoyByText/:text",
      async (req, res) => {
        try {
          const text = req.params.text || "";

          if (!text.trim()) {
            return res.status(200).json([]);
          }

          const safeText =
            escapeRegex(text.trim());

          const result =
            await EducationCollection.find({
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
          });
        }
      }
    );

    // ===================================================
    // GET MY TOYS
    // ===================================================

    app.get(
      "/myToys/:email",
      async (req, res) => {
        try {
          const email = decodeURIComponent(
            req.params.email
          );

          const { sort } = req.query;

          // -------------------------------
          // Validate email
          // -------------------------------

          if (!email) {
            return res.status(400).json({
              message: "Email is required",
            });
          }

          const query = {
            sellerEmail: email,
          };

          // -------------------------------
          // Sort
          // -------------------------------

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

          // -------------------------------
          // Fetch
          // -------------------------------

          const toys =
            await EducationCollection.find(
              query
            )
              .sort(sortOption)
              .toArray();

          res.status(200).json(toys);
        } catch (error) {
          console.error(
            "Failed to fetch toy data:",
            error
          );

          res.status(500).json({
            message:
              "Failed to fetch toy data",
          });
        }
      }
    );

    // ===================================================
    // ADD TOY
    // ===================================================

    app.post(
      "/addtoy",
      async (req, res) => {
        try {
          const toyData = {
            ...req.body,
          };

          // -------------------------------
          // Required fields
          // -------------------------------

          if (!toyData.toyName) {
            return res.status(400).json({
              message: "Toy name is required",
              status: false,
            });
          }

          if (!toyData.sellerEmail) {
            return res.status(400).json({
              message:
                "Seller email is required",
              status: false,
            });
          }

          // -------------------------------
          // Numeric fields
          // -------------------------------

          const price = Number(
            toyData.price
          );

          const rating = Number(
            toyData.toyRating
          );

          const quantity = Number(
            toyData.availableQuantity
          );

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

          // -------------------------------
          // Assign normalized values
          // -------------------------------

          toyData.price = price;

          toyData.toyRating = rating;

          toyData.availableQuantity =
            quantity;

          toyData.createdAt = new Date();

          // -------------------------------
          // Insert
          // -------------------------------

          const result =
            await EducationCollection.insertOne(
              toyData
            );

          if (result?.insertedId) {
            return res.status(201).json({
              message:
                "Toy added successfully",
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

    // ===================================================
    // UPDATE TOY
    // ===================================================

    app.patch(
      "/updateToy/:id",
      async (req, res) => {
        try {
          const { id } = req.params;

          // -------------------------------
          // Validate ID
          // -------------------------------

          if (!isValidObjectId(id)) {
            return res.status(400).json({
              message: "Invalid toy ID",
            });
          }

          const {
            price,
            toyRating,
            availableQuantity,
          } = req.body;

          // -------------------------------
          // Validate values
          // -------------------------------

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
            });
          }

          if (
            Number.isNaN(numericRating)
          ) {
            return res.status(400).json({
              message:
                "Rating must be a valid number",
            });
          }

          if (
            Number.isNaN(numericQuantity)
          ) {
            return res.status(400).json({
              message:
                "Available quantity must be a valid number",
            });
          }

          // -------------------------------
          // Filter
          // -------------------------------

          const filter = {
            _id: new ObjectId(id),
          };

          // -------------------------------
          // Update document
          // -------------------------------

          const updateDoc = {
            $set: {
              price: numericPrice,

              toyRating: numericRating,

              availableQuantity:
                numericQuantity,

              updatedAt: new Date(),
            },
          };

          // -------------------------------
          // Update
          // -------------------------------

          const result =
            await EducationCollection.updateOne(
              filter,
              updateDoc
            );

          // -------------------------------
          // Not found
          // -------------------------------

          if (result.matchedCount === 0) {
            return res.status(404).json({
              message: "Toy not found",
            });
          }

          // -------------------------------
          // Success
          // -------------------------------

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
            message:
              "Failed to update toy",
            status: false,
          });
        }
      }
    );

    // ===================================================
    // DELETE TOY
    // ===================================================

    app.delete(
      "/myToys/:id",
      async (req, res) => {
        try {
          const { id } = req.params;

          // -------------------------------
          // Validate ID
          // -------------------------------

          if (!isValidObjectId(id)) {
            return res.status(400).json({
              message:
                "Invalid toy ID",
            });
          }

          const query = {
            _id: new ObjectId(id),
          };

          // -------------------------------
          // Delete
          // -------------------------------

          const result =
            await EducationCollection.deleteOne(
              query
            );

          // -------------------------------
          // Not found
          // -------------------------------

          if (result.deletedCount === 0) {
            return res.status(404).json({
              message:
                "Toy not found",
            });
          }

          // -------------------------------
          // Success
          // -------------------------------

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
            message:
              "Internal Server Error",
            status: false,
          });
        }
      }
    );

    // ===================================================
    // 404 ROUTE
    // ===================================================

    app.use((req, res) => {
      res.status(404).json({
        message: "Route not found",
        path: req.originalUrl,
      });
    });

    // ===================================================
    // START SERVER
    // ===================================================

    app.listen(port, () => {
      console.log(
        `Educational & Learning server is running on port ${port}`
      );
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error
    );

    process.exit(1);
  }
}

// =====================================================
// START APPLICATION
// =====================================================

run();

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

process.on(
  "SIGINT",
  async () => {
    await client.close();

    console.log(
      "MongoDB connection closed."
    );

    process.exit(0);
  }
);

process.on(
  "SIGTERM",
  async () => {
    await client.close();

    console.log(
      "MongoDB connection closed."
    );

    process.exit(0);
  }
);