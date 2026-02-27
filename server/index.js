const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;
const MONGO_URI = 'mongodb+srv://Gautam:Gokuisthebest@gautam-lady-shoes.bciidm3.mongodb.net/football?appName=gautam-lady-shoes';
const SUBMIT_PASSWORD = '2244';

app.use(cors());
app.use(express.json());

// ── Mongoose Schemas ──────────────────────────────────────────────
const playerSchema = new mongoose.Schema({
  key:    { type: String, required: true },   // lowercase key e.g. "dilip"
  name:   { type: String, required: true },
  played: { type: Number, default: 0 },
  won:    { type: Number, default: 0 },
  drawn:  { type: Number, default: 0 },
  lost:   { type: Number, default: 0 },
  gf:     { type: Number, default: 0 },
  ga:     { type: Number, default: 0 },
  gd:     { type: Number, default: 0 },
  points: { type: Number, default: 0 },
}, { versionKey: false });

const matchSchema = new mongoose.Schema({
  id:         { type: Number, required: true },
  homePlayer: String,
  awayPlayer: String,
  homeGoals:  Number,
  awayGoals:  Number,
  date:       String,
}, { versionKey: false });

const Player = mongoose.model('Player', playerSchema);
const Match  = mongoose.model('Match',  matchSchema);

// Initial players (seeded once if DB is empty)
const INITIAL_PLAYERS = [
  { key: 'dilip',   name: 'Dilip'   },
  { key: 'sankit',  name: 'Sankit'  },
  { key: 'prajwol', name: 'Prajwol' },
  { key: 'anish',   name: 'Anish'   },
];

async function seedPlayers() {
  const count = await Player.countDocuments();
  if (count === 0) {
    await Player.insertMany(INITIAL_PLAYERS.map(p => ({
      ...p, played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0
    })));
    console.log('Players seeded');
  }
}

// Connect to MongoDB then start server
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedPlayers();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// ── GET /api/standings ──────────────────────────────────────────
app.get('/api/standings', async (req, res) => {
  try {
    const players = await Player.find({}, '-_id -key');
    const sorted = players.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load standings' });
  }
});

// ── GET /api/matches ─────────────────────────────────────────────
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await Match.find({}, '-_id').sort({ id: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

// ── POST /api/result ─────────────────────────────────────────────
app.post('/api/result', async (req, res) => {
  const { homePlayer, awayPlayer, homeGoals, awayGoals, password } = req.body;

  if (password !== SUBMIT_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (!homePlayer || !awayPlayer || homeGoals === undefined || awayGoals === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (homePlayer === awayPlayer) {
    return res.status(400).json({ error: 'Players must be different' });
  }

  const hGoals = parseInt(homeGoals);
  const aGoals = parseInt(awayGoals);
  if (isNaN(hGoals) || isNaN(aGoals) || hGoals < 0 || aGoals < 0) {
    return res.status(400).json({ error: 'Goals must be non-negative numbers' });
  }

  try {
    const home = await Player.findOne({ key: homePlayer.toLowerCase() });
    const away = await Player.findOne({ key: awayPlayer.toLowerCase() });
    if (!home || !away) return res.status(400).json({ error: 'Invalid player name' });

    home.played++; away.played++;
    home.gf += hGoals; home.ga += aGoals;
    away.gf += aGoals; away.ga += hGoals;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (hGoals > aGoals) {
      home.won++; home.points += 2; away.lost++;
    } else if (hGoals < aGoals) {
      away.won++; away.points += 2; home.lost++;
    } else {
      home.drawn++; away.drawn++;
      home.points += 1; away.points += 1;
    }

    await Promise.all([home.save(), away.save()]);

    await Match.create({
      id: Date.now(),
      homePlayer: home.name,
      awayPlayer: away.name,
      homeGoals: hGoals,
      awayGoals: aGoals,
      date: new Date().toISOString(),
    });

    res.json({ message: 'Result submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit result' });
  }
});

// ── POST /api/reset ──────────────────────────────────────────────
app.post('/api/reset', async (req, res) => {
  const { password } = req.body;
  if (password !== SUBMIT_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  try {
    await Player.updateMany({}, { played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0 });
    await Match.deleteMany({});
    res.json({ message: 'League reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset league' });
  }
});

// ── DELETE /api/matches/:id ──────────────────────────────────────
app.delete('/api/matches/:id', async (req, res) => {
  const { password } = req.body;
  if (password !== SUBMIT_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const matchId = parseInt(req.params.id);
  try {
    const match = await Match.findOne({ id: matchId });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const home = await Player.findOne({ key: match.homePlayer.toLowerCase() });
    const away = await Player.findOne({ key: match.awayPlayer.toLowerCase() });

    home.played--; away.played--;
    home.gf -= match.homeGoals; home.ga -= match.awayGoals;
    away.gf -= match.awayGoals; away.ga -= match.homeGoals;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (match.homeGoals > match.awayGoals) {
      home.won--; home.points -= 2; away.lost--;
    } else if (match.homeGoals < match.awayGoals) {
      away.won--; away.points -= 2; home.lost--;
    } else {
      home.drawn--; away.drawn--;
      home.points -= 1; away.points -= 1;
    }

    await Promise.all([home.save(), away.save()]);
    await Match.deleteOne({ id: matchId });

    res.json({ message: 'Match removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove match' });
  }
});
