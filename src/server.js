import express from "express";

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

app.post("/api/tribes/:slug/suggest", (req, res) => {
	const { slug } = req.params;
	const { suggestion, suggestedBy } = req.body;

	const tribe = tribes.find((tribe) => tribe.slug === slug);
	tribe.suggestions.push({ suggestion, suggestedBy });
	res.json({ tribe });
});

app.post("/api/tribes/:slug/upvote", (req, res) => {
	const tribe = tribes.find((tribe) => tribe.slug === req.params.slug);
	tribe.upvotes += 1;
	res.json({ tribe });
});

app.listen(8000, function () {
	console.log("Listening on port 8000...");
});
