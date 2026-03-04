// controllers/sessionController.js
const Session = require('../models/sessionModel');
const { v4: uuidv4 } = require('uuid');
const transporter = require('../config/email');

// Create a new session
const startNew = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name) {
      return res.status(400).send('Name is required');
    }
    
    if (!email) {
      return res.status(400).send('Email is required');
    }
    
    // Generate a unique ID (8 characters)
    const uniqueId = require('crypto').randomBytes(4).toString('hex');

    
    // Create new session
    const session = await Session.create({
      uniqueId,
      name,
      email,
      spaces: []
    });
    
    // Store in session cookie
    req.session.uniqueId = uniqueId;
    req.session.name = name;
    req.session.email = email;
    
    // Send email with session code (only if email is configured)
    let emailSent = false;
    if (process.env.GMAIL_USER && process.env.GMAIL_USER !== 'your-email@gmail.com') {
      try {
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: email,
          subject: 'Your PrepAi Session Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%); color: white; border-radius: 10px;">
              <h1 style="text-align: center; margin-bottom: 20px;">Welcome to PrepAi!</h1>
              <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; backdrop-filter: blur(10px);">
                <h2 style="margin-top: 0;">Hello ${name},</h2>
                <p style="font-size: 16px; line-height: 1.6;">Your interview preparation session has been created successfully!</p>
                <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Your Session Code:</p>
                  <h1 style="margin: 0; font-size: 36px; letter-spacing: 4px; font-weight: bold;">${uniqueId}</h1>
                </div>
                <p style="font-size: 14px; line-height: 1.6;"><strong>Important:</strong> Save this code to continue your session later. You can access your interview spaces anytime using this code.</p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/welcome" style="display: inline-block; background: white; color: #6366f1; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Start Practicing</a>
                </div>
              </div>
              <p style="text-align: center; margin-top: 20px; font-size: 12px; opacity: 0.8;">PrepAi - Ace Every Interview With AI Coaching</p>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log('Session code email sent to:', email);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue even if email fails
      }
    } else {
      console.log('Email not configured in .env - skipping email sending');
    }
    
    // Return success with uniqueId
    res.render('student/session-created', {
      uniqueId,
      name,
      email,
      emailSent
    });
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).send('Error creating session. Please try again.');
  }
};

// Continue with existing session
const continueSession = async (req, res) => {
  try {
    const { uniqueId } = req.body;
    
    if (!uniqueId) {
      return res.status(400).send('Session ID is required');
    }
    
    // Find the session
    const session = await Session.findOne({ uniqueId });
    
    if (!session) {
      return res.render('welcome', {
        error: 'Session not found. Please check your ID.'
      });
    }
    
    // Update last active time
    session.lastActive = Date.now();
    await session.save();
    
    // Store in session cookie
    req.session.uniqueId = uniqueId;
    req.session.name = session.name;
    
    // Redirect to dashboard
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Error continuing session:', error);
    res.status(500).send('Error accessing session. Please try again.');
  }
};

// Get profile 
const getProfile = async (req, res) => {
  try {
    const session = await Session.findOne({ uniqueId: req.session.uniqueId });

    if (!session) {
      return res.status(404).send('Session not found');
    }

    res.render('student/profile', {
      name: session.name,
      uniqueId: session.uniqueId,
      email: session.email,
      success: req.query.success === 'true'
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Error fetching profile');
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const session = await Session.findOneAndUpdate(
      { uniqueId: req.session.uniqueId },
      { name },
      { new: true }
    );

    if (!session) {
      return res.status(404).send('Session not found');
    }

    // Update session cookie
    req.session.name = name;

    res.redirect('/profile?success=true');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Failed to update profile');
  }
};

// End session
const endSession = (req, res) => {
  req.session = null; // Clear the session
  res.redirect('/home'); // Redirect to home page
};

exports.createSession = async (name, email) => {
  const uniqueId = require('crypto').randomBytes(4).toString('hex');
  
  const session = await Session.create({
    uniqueId,
    name,
    email,
    spaces: []
  });
  
  // Send email with session code (only if email is configured)
  let emailSent = false;
  console.log('📧 ========== EMAIL SENDING ATTEMPT ==========');
  console.log('GMAIL_USER from env:', process.env.GMAIL_USER);
  console.log('GMAIL_PASS set:', process.env.GMAIL_PASS ? 'Yes' : 'No');
  console.log('Email to send to:', email);
  
  if (process.env.GMAIL_USER && process.env.GMAIL_USER !== 'your-email@gmail.com' && process.env.GMAIL_PASS) {
    console.log('✅ Email is configured, attempting to send...');
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });
      
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Your PrepAi Session Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%); color: white; border-radius: 10px;">
            <h1 style="text-align: center; margin-bottom: 20px;">Welcome to PrepAi!</h1>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; backdrop-filter: blur(10px);">
              <h2 style="margin-top: 0;">Hello ${name},</h2>
              <p style="font-size: 16px; line-height: 1.6;">Your interview preparation session has been created successfully!</p>
              <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Your Session Code:</p>
                <h1 style="margin: 0; font-size: 36px; letter-spacing: 4px; font-weight: bold;">${uniqueId}</h1>
              </div>
              <p style="font-size: 14px; line-height: 1.6;"><strong>Important:</strong> Save this code to continue your session later. You can access your interview spaces anytime using this code.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/welcome" style="display: inline-block; background: white; color: #6366f1; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Start Practicing</a>
              </div>
            </div>
            <p style="text-align: center; margin-top: 20px; font-size: 12px; opacity: 0.8;">PrepAi - Ace Every Interview With AI Coaching</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log('✅✅✅ EMAIL SENT SUCCESSFULLY to:', email);
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError.message);
      console.error('Full error:', emailError);
    }
  } else {
    console.log('⚠️ Email NOT configured - Missing credentials');
    console.log('   - GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET');
    console.log('   - GMAIL_PASS:', process.env.GMAIL_PASS ? 'SET' : 'NOT SET');
  }
  console.log('========================================');
  
  return { ...session.toObject(), emailSent };
};

// Change to include it in the final module.exports:
const createSession = async (name, email) => {
  const uniqueId = require('crypto').randomBytes(4).toString('hex');
  
  const session = await Session.create({
    uniqueId,
    name,
    email,
    spaces: []
  });
  
  return session;
};

// Find a session by uniqueId (helper function)
findSession = async (uniqueId) => {
  const session = await Session.findOne({ uniqueId });
  
  if (session) {
    // Update last active time
    session.lastActive = Date.now();
    await session.save();
  }
  
  return session;
};

// Send session code via email
const sendCodeEmail = async (req, res) => {
  try {
    const session = await Session.findOne({ uniqueId: req.session.uniqueId });
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (!session.email) {
      return res.status(400).json({ success: false, error: 'No email associated with this session' });
    }
    
    // Check if email is configured
    if (!transporter) {
      console.error('❌ Email transporter not configured');
      return res.status(503).json({ 
        success: false, 
        error: 'Email service not configured. Please contact administrator.' 
      });
    }
    
    if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'your-email@gmail.com') {
      console.error('❌ Gmail user not set in environment variables');
      return res.status(503).json({ 
        success: false, 
        error: 'Email credentials not configured properly.' 
      });
    }
    
    // Send email
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: session.email,
        subject: 'Your PrepAi Session Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%); color: white; border-radius: 10px;">
            <h1 style="text-align: center; margin-bottom: 20px;">PrepAi Session Code</h1>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; backdrop-filter: blur(10px);">
              <h2 style="margin-top: 0;">Hello ${session.name},</h2>
              <p style="font-size: 16px; line-height: 1.6;">Here is your session code as requested:</p>
              <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Your Session Code:</p>
                <h1 style="margin: 0; font-size: 36px; letter-spacing: 4px; font-weight: bold;">${session.uniqueId}</h1>
              </div>
              <p style="font-size: 14px; line-height: 1.6;">You can use this code to access your interview spaces from any device.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/welcome" style="display: inline-block; background: white; color: #6366f1; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Continue to PrepAi</a>
              </div>
            </div>
            <p style="text-align: center; margin-top: 20px; font-size: 12px; opacity: 0.8;">PrepAi - Ace Every Interview With AI Coaching</p>
          </div>
        `
      };
      
      console.log('📧 Attempting to send session code email to:', session.email);
      await transporter.sendMail(mailOptions);
      console.log('✅ Session code email resent successfully to:', session.email);
      
      return res.json({ success: true, message: 'Email sent successfully' });
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      console.error('Email error details:', {
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send email. Please check server logs.',
        details: emailError.message 
      });
    }
  } catch (error) {
    console.error('Error in sendCodeEmail:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { 
  getProfile, 
  updateProfile, 
  startNew, 
  continueSession, 
  endSession,
  createSession,  // Add this line
  findSession,
  sendCodeEmail
};