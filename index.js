const express = require('express');
const admin = require('firebase-admin');
require('dotenv').config();
const cors = require('cors');
const app = express();

// Enable CORS for specific origins
const allowedOrigins = ['http://localhost:3001', 'https://YOUR_VERCEL_URL']; // Add your Vercel URL after deployment
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
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

app.get('/', (req, res) => res.json({ message: 'Hello, Agent!' }));
app.post('/signup', async (req, res) => {
  try {
    const { uid, name, email, niche, audience } = req.body;
    
    // Input validation
    if (!uid || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = admin.firestore();
    const batch = db.batch();
    
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, { 
      name, 
      email, 
      niche,
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    const agentRef = db.collection('agents').doc();
    batch.set(agentRef, { 
      client_id: uid, 
      niche, 
      audience,
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    await batch.commit();
    res.json({ 
      message: 'User and agent created successfully',
      userId: uid,
      agentId: agentRef.id
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
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
app.get('/health', (req, res) => res.status(200).send('OK'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));