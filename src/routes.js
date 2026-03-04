// routes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sessionController = require('./controllers/sessionController');
const spaceController = require('./controllers/spaceController');
const interviewController = require('./controllers/interviewController');
const multer = require('multer');

// Simple protection middleware
const protect = (req, res, next) => {
  if (!req.session.uniqueId) {
    return res.redirect('/home');
  }
  next();
};

// Ensure 'Resumes' folder exists
const resumeFolderPath = path.join(__dirname, '../../public/Resumes');
if (!fs.existsSync(resumeFolderPath)) {
  fs.mkdirSync(resumeFolderPath, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeFolderPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Loading / game page — served immediately while server wakes up
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/tictactoe.html'));
});

// Actual home page (login / start)
router.get('/home', (req, res) => {
  if (req.session.uniqueId) {
    return res.redirect('/dashboard');
  }
  res.render('home');
});

router.get('/welcome', (req, res) => {
  res.render('welcome');
});

// Add this to routes.js
router.get('/api/questions-answers/:roundId', protect, interviewController.getQuestionsAnswers);

// Also add a route to download resumes
router.get('/space/resume/download/:id', protect, spaceController.downloadResume);

// Add this route for AJAX session creation
router.post('/api/start-new', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Call the session controller function
    const result = await sessionController.createSession(name, email);
    
    // Store in session cookie
    req.session.uniqueId = result.uniqueId;
    req.session.name = result.name;
    req.session.email = result.email;
    
    // Return success with the session data
    return res.json({ 
      success: true, 
      uniqueId: result.uniqueId,
      email: result.email,
      emailSent: result.emailSent || false,
      redirectUrl: '/dashboard'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Error creating session' });
  }
});

// Add this route for AJAX session continuation
router.post('/api/continue-session', async (req, res) => {
  try {
    const { uniqueId } = req.body;
    
    if (!uniqueId || uniqueId.trim() === '') {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Attempt to find the session
    const session = await sessionController.findSession(uniqueId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found. Please check your ID.' });
    }
    
    // Store in session cookie
    req.session.uniqueId = session.uniqueId;
    req.session.name = session.name;
    
    // Return success
    return res.json({ 
      success: true, 
      redirectUrl: '/dashboard'
    });
  } catch (error) {
    console.error('Error continuing session:', error);
    return res.status(500).json({ error: 'Error accessing session' });
  }
});

// Session routes
router.post('/start-new', sessionController.startNew);
router.post('/continue-session', sessionController.continueSession);
router.get('/end-session', sessionController.endSession);

// Dashboard routes (protected)
router.get('/dashboard', protect, spaceController.getSpaces);
router.get('/profile', protect, sessionController.getProfile);
router.post('/update-profile', protect, sessionController.updateProfile);
router.post('/api/send-code-email', protect, sessionController.sendCodeEmail);

// Space routes
router.post('/spaces/create', [protect, upload.single('resume')], spaceController.createSpace);
router.get('/space/:id', protect, spaceController.getSpaceDetails);

// Interview routes
router.get('/space/:spaceId/round/:roundName/start', protect, (req, res) => {
  const { spaceId, roundName } = req.params;
  res.render('student/interview-screen', { spaceId, roundName });
});

router.get('/generate-questions/:spaceId/:roundName', protect, interviewController.startRound);
router.post('/finish-round/:spaceId/:roundName', protect, interviewController.finishRound);

module.exports = router;