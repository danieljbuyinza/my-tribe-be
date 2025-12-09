import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";

const tribes = [
	{
		name: "Tribe A",
		slug: "tribe-a",
		members: 10,
		upvotes: 5,
		suggestions: [],
	},
	{
		name: "Tribe B",
		slug: "tribe-b",
		members: 25,
		upvotes: 10,
		suggestions: [],
	},
	{
		name: "Tribe C",
		slug: "tribe-c",
		members: 15,
		upvotes: 8,
		suggestions: [],
	},
];

const app = express();

app.use(express.json());

let db;

async function connectToDatabase() {
	const uri = "mongodb://127.0.0.1:27017";
	const client = new MongoClient(uri, {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		},
	});
	await client.connect();
	db = client.db("my-tribe-db");
}

app.get("/api/tribes/:slug", async (req, res) => {
	const { slug } = req.params;
	const tribe = await db.collection("tribes").findOne({ slug });
	res.json({ tribe });
});

app.post("/api/tribes/:slug/suggest", async (req, res) => {
	const { slug } = req.params;
	const { suggestion, suggestedBy } = req.body;
	const newSuggestion = { suggestion, suggestedBy };

	const tribe = await db.collection("tribes").findOneAndUpdate(
		{ slug },
		{
			$push: { suggestions: newSuggestion },
		},
		{ returnDocument: "after" }
	);
	res.json({ tribe });
});

app.post("/api/tribes/:slug/upvote", async (req, res) => {
	const { slug } = req.params;
	const tribe = await db.collection("tribes").findOneAndUpdate(
		{ slug },
		{
			$inc: { upvotes: 1 },
		},
		{ returnDocument: "after" }
	);
	res.json({ tribe });
});

async function startServer() {
	await connectToDatabase();
	app.listen(8000, function () {
		console.log("Listening on port 8000...");
	});
}
startServer();
