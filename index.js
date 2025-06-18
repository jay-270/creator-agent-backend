const express = require('express');
const admin = require('firebase-admin');
require('dotenv').config();
const cors = require('cors');
const app = express();

const allowedOrigins = ['http://localhost:3001', 'https://YOUR_VERCEL_URL']; // Replace with actual Vercel URL
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
});

app.get('/', (req, res) => res.json({ message: 'Hello, Agent!' }));
app.post('/signup', async (req, res) => {
  const { uid, name, email, niche, audience } = req.body;
  const db = admin.firestore();
  try {
    await db.collection('users').doc(uid).set({ name, email, niche });
    await db.collection('agents').add({ client_id: uid, niche, audience });
    res.json({ message: 'User and agent created' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.get('/agents', async (req, res) => {
  const { uid } = req.query;
  const db = admin.firestore();
  try {
    const snapshot = await db.collection('agents').where('client_id', '==', uid).get();
    const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));