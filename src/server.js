import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
	fs.readFileSync("my-tribe-firebase-credentials.json")
);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const app = express();

app.use(express.json());

let db;

async function connectToDatabase() {
	const uri = !process.env.MONGODB_USERNAME
		? "mongodb://127.0.0.1:27017"
		: `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_DATABASE}/?appName=${process.env.MONGODB_APP_NAME}`;
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

app.use(express.static(path.join(__dirname, "../dist")));

app.get(/^(?!\/api).+/, (req, res) => {
	res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.get("/api/tribes", async (req, res) => {
	const tribes = await db.collection("tribes").find({}).toArray();
	res.json({ tribes });
});

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

const PORT = process.env.PORT || 8000;

async function startServer() {
	await connectToDatabase();
	app.listen(PORT, function () {
		console.log(`Listening on port ${PORT}...`);
	});
}
startServer();
