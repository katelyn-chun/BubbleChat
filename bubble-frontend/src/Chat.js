import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function Chat({ selectedRoom }) {
  const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // Memoized scroll function to prevent unnecessary re-renders
  const scrollToBottom = useCallback(() => {
    if (!userHasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [userHasScrolled]);

  useEffect(() => {
    if (selectedRoom) {
      socket.emit("joinRoom", selectedRoom);

      socket.on("previousMessages", (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });

      socket.on("receiveMessage", (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      });

      return () => {
        socket.emit("leaveRoom", selectedRoom);
        socket.off("previousMessages");
        socket.off("receiveMessage");
      };
    }
  }, [selectedRoom, scrollToBottom]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setUserHasScrolled(scrollTop + clientHeight < scrollHeight - 10);
  };

  const sendMessage = () => {
    if (message.trim() && isAuthenticated) {
      const msgData = { room: selectedRoom, user: user.name, text: message };
      socket.emit("sendMessage", msgData);
      setMessage("");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", textAlign: "center" }}>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        {!isAuthenticated ? (
          <button onClick={loginWithRedirect} style={styles.button}>
            Log In
          </button>
        ) : (
          <>
            <span>Logged in with {user.name} </span>
            <button onClick={() => logout({ returnTo: window.location.origin })} style={styles.button}>
              Log Out
            </button>
          </>
        )}
      </div>

      <div style={styles.chatContainer} onScroll={handleScroll}>
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index} className="message" style={styles.messages}>
              <strong>{message.user}</strong>: {message.text}
            </div>
          ))
        ) : (
          <p style={{ color: "#aaa" }}>No messages yet. Be the first to chat!</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isAuthenticated ? (
        <>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a message..."
            style={styles.input}
          />
          <button onClick={sendMessage} style={styles.send}>
            Send
          </button>
        </>
      ) : (
        <p style={{ color: "red", marginTop: "10px" }}>Log in to send messages</p>
      )}
    </div>
  );
}

const styles = {
  messages: {
    alignItems: "flex-start",
    marginBottom: "10px",
    display: "flex",
  },
  button: {
    fontFamily: "'Jost', sans-serif",
    backgroundColor: "#598aab",
    color: "white",
    border: "none",
    padding: "8px 15px",
    cursor: "pointer",
    borderRadius: "8px",
  },
  chatContainer: {
    border: "1px solid #ddd",
    padding: "10px",
    minHeight: "300px",
    maxHeight: "300px",
    overflowY: "auto",
    scrollBehavior: "smooth",
  },
  input: {
    width: "80%",
    padding: "5px",
    marginTop: "10px",
  },
  send: {
    backgroundColor: "#598aab",
    color: "white",
    border: "none",
    padding: "8px 10px",
    cursor: "pointer",
    borderRadius: "8px",
  },
};

export default Chat;
