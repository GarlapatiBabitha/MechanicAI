

import React, { useState, useEffect, useRef } from 'react';
import './main.css';
import { assets } from '../../assets/assets';
import botResponses from '../../assets/botResponses.json';
import axios from 'axios';
import { account } from '../../appwrite'; // Import the account object from Appwrite.js

const API_URL = 'http://localhost:5000'; // Replace with the backend server URL

const Main = ({ resetChat, onLogout, previousConversation }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isFirstMessageSent, setIsFirstMessageSent] = useState(false);
  const [cardMessages, setCardMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Dropdown visibility
  const [userEmail, setUserEmail] = useState(''); // Store logged-in user's email

  useEffect(() => {
    if (previousConversation && previousConversation.length > 0) {
      setMessages(previousConversation);
      setIsFirstMessageSent(true); // Indicate that the chat has started
    }
  }, [previousConversation]);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = await account.get(); // Fetch the logged-in user from Appwrite
        setUserEmail(user.email || ''); 
        setUserId(user?.$id || null); // Save the userId
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUserId();
  }, []);

  const getRandomProblemsForCards = () => {
    const keys = Object.keys(botResponses);
    const randomProblems = [];
    while (randomProblems.length < 4) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const randomProblem = botResponses[randomKey];
      if (!randomProblems.some((problem) => problem.title === randomProblem.title)) {
        randomProblems.push({ ...randomProblem, key: randomKey });
      }
    }
    return randomProblems;
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const formatBotResponse = (responseText) => {
    // Transform the bot response to the required format
    return `Diagnosis:\n${responseText}\n\nInstructions:\n\n1. Find a safe location: Move your vehicle to a level surface, away from traffic.\n2. Turn off the engine: Engage the parking brake.\n3. Gather equipment: Collect the spare tire, lug wrench, and car jack (located in your vehicle's trunk).\n4. Loosen the lug nuts: Before lifting the vehicle, loosen the lug nuts on the flat tire with the lug wrench. Do not remove them yet.\n5. Lift the vehicle: Use the car jack to lift the vehicle until the flat tire is off the ground.\n6. Remove the lug nuts: Completely remove the lug nuts from the wheel hub.\n7. Remove the flat tire: Carefully pull the flat tire straight off the wheel hub and set it aside.\n8. Install the spare tire: Place the spare tire onto the wheel hub, making sure it's securely seated.\n9. Hand tighten the lug nuts: Hand tighten the lug nuts in a star pattern (tightening one lug nut a little, then moving to the next one, and so on).\n10. Lower the vehicle: Carefully lower the vehicle to the ground using the car jack.\n\nTools Required:\n\n- Spare tire\n- Lug wrench\n- Car jack\n\nParts Replacement:\n\n- None required (the spare tire is temporary and meant for emergency use only)\n\nSafety Tips:\n\n- Make sure the parking brake is engaged when changing a tire.\n- Always refer to your vehicle's owner's manual for specific instructions on how to change a tire for your particular vehicle model.\n\nConfirmations:\n\n- Have you checked if the spare tire is properly inflated?\n- Are you comfortable with changing the tire, or would you like me to provide more guidance?`;
  };

  const handleSend = async () => {
    if (!userId) {
      console.error('User ID is not available');
      return;
    }

    if (input.trim()) {
      setIsFirstMessageSent(true);
      const newMessage = { sender: 'user', text: input };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInput('');
      inputRef.current?.focus();

      try {
        let response;
        if (!sessionId) {
          // Create a new session for the first message
          response = await axios.post(`${API_URL}/api/new`, { userId, message: input });
          console.log('New session created with ID:', response.data.sessionId);
          setSessionId(response.data.sessionId); // Save the session ID
        } else {
          // Use the existing session ID for subsequent messages
          response = await axios.post(`${API_URL}/api/message`, { userId, sessionId, message: input });
        }

        const formattedResponse = formatBotResponse(response.data.response);

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'bot', text: formattedResponse },
        ]);
      } catch (error) {
        console.error('Error in sending message:', error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'bot', text: 'Oops! Something went wrong. Please try again.' },
        ]);
      }
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleCardClick = async (messageKey) => {
    const selectedProblem = botResponses[messageKey];
    const userMessage = selectedProblem.title;

    setIsFirstMessageSent(true);
    setMessages((prevMessages) => [...prevMessages, { sender: 'user', text: userMessage }]);

    try {
      let response;
      if (!sessionId) {
        // Create a new session when clicking a card
        response = await axios.post(`${API_URL}/api/new`, { userId, message: userMessage });
        console.log('New session created with ID:', response.data.sessionId);
        setSessionId(response.data.sessionId);
      } else {
        response = await axios.post(`${API_URL}/api/message`, { userId, sessionId, message: userMessage });
      }

      const formattedResponse = formatBotResponse(response.data.response);

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: formattedResponse },
      ]);
    } catch (error) {
      console.error('Error in creating chat from card:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: 'An error occurred. Please try again.' },
      ]);
    }
  };

  const startNewChat = () => {
    setSessionId(null); // Reset session ID for a new conversation
    setMessages([]);
    setIsFirstMessageSent(false);
  };

  useEffect(() => {
    setCardMessages(getRandomProblemsForCards());
    startNewChat();
  }, [resetChat]);

  return (
    <div className="main">
      <div className="nav">
        <p>Mechanic-AI</p>
        <div className="user-section">
          <div className="user-avatar" onClick={toggleDropdown}>
            {userEmail.charAt(0).toUpperCase()} {/* First letter of email */}
          </div>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <p className="dropdown-email">{userEmail}</p>
              <button className="dropdown-item" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="main-container">
        {!isFirstMessageSent ? (
          <>
            <div className="greet">
              <p>
                <span>Hello, Dev</span>
              </p>
              <p>How can I help you today?</p>
            </div>
            <div className="cards">
              {cardMessages.map((card, index) => (
                <div
                  key={index}
                  className="card"
                  onClick={() => handleCardClick(card.key)}
                >
                  <p>{card.title}</p>
                  <img src={assets[card.icon]} alt={`${card.title} Icon`} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="chat-section" ref={chatRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message-row ${message.sender === "user" ? "user-row" : "bot-row"}`}
              >
                {message.sender === "bot" && (
                  <img src={assets.gemini_icon} alt="Bot Icon" className="message-icon" />
                )}
                                
                <div className={`message ${message.sender === "user" ? "user-message" : "bot-message"}`}>
                  {message.sender === "bot" ? (
                    <pre className="bot-formatted-response">
                      {message.text.replace(/\*/g, "")} {/* Removes all * symbols */}
                    </pre>
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>


              </div>
            ))}
          </div>
        )}

        <div className="main-bottom">
          <div className="search-box">
            <input
              type="text"
              placeholder="Enter a prompt here"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              ref={inputRef}
            />
            <div onClick={handleSend}>
              <img src={assets.send_icon} alt="Send Icon" />
            </div>
          </div>
          <p className="bottom-info">This may display inaccurate info</p>
        </div>
      </div>
    </div>
  );
};

export default Main;
