import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
	fs.readFileSync("my-tribe-firebase-credentials.json")
);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

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

app.use(async function (req, res, next) {
	const authToken = req.headers.authtoken;
	if (authToken) {
		const user = await admin.auth().verifyIdToken(authToken);
		req.user = user;
		next();
	} else {
		res.status(400).json({ error: "Missing auth token" });
	}
});

app.post("/api/tribes/:slug/suggest-next-read", async (req, res) => {
	const { slug } = req.params;
	const { book, author, suggestedBy } = req.body;
	const suggestedRead = { book, author, suggestedBy };

	const tribe = await db.collection("tribes").findOneAndUpdate(
		{ slug },
		{
			$push: { suggestedReads: suggestedRead },
		},
		{ returnDocument: "after" }
	);
	res.json({ tribe });
});

app.post("/api/tribes/:slug/upvote", async (req, res) => {
	const { slug } = req.params;
	const upvoteId = req.user.uid;

	const tribe = await db.collection("tribes").findOne({ slug });

	const upvoteIds = tribe.upvoteIds || [];
	const canUpvote = upvoteId && !upvoteIds.includes(upvoteId);

	if (canUpvote) {
		const updatedTribe = await db.collection("tribes").findOneAndUpdate(
			{ slug },
			{
				$inc: { upvotes: 1 },
				$push: { upvoteIds: upvoteId },
			},
			{ returnDocument: "after" }
		);
		res.json({ updatedTribe });
	} else {
		res.sendStatus(403);
	}
});

async function startServer() {
	await connectToDatabase();
	app.listen(8000, function () {
		console.log("Listening on port 8000...");
	});
}
startServer();
