import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Chat from "./Chat";
import axios from "axios";

const App = () => {
  const { user, isAuthenticated } = useAuth0();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:5000/chatrooms")
      .then((response) => {
        setRooms(response.data);
        if (response.data.length > 0) setSelectedRoom(response.data[0].name);
      })
      .catch((error) => console.error("Error fetching chat rooms:", error));
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      axios.get(`http://localhost:5000/users/${user.email}`)
        .then(response => {
          setDisplayName(response.data.displayName || ""); // Ensure it gets set
          setIsEditingDisplayName(!response.data.displayName); // Only force edit mode if no display name
        })
        .catch(error => {
          console.error("Error fetching user display name:", error);
          setIsEditingDisplayName(true); // Ensure editing mode is available if there's an error
        });
    }
  }, [isAuthenticated, user]);  

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || rooms.some(room => room.name === newRoomName)) return;
    try {
      await axios.post("http://localhost:5000/chatrooms", { name: newRoomName });
      const response = await axios.get("http://localhost:5000/chatrooms");
      setRooms(response.data);
      setNewRoomName("");
    } catch (error) {
      console.error("Error creating chat room:", error);
      alert(`Failed to create chat room: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) return;
  
    try {
      const encodedEmail = encodeURIComponent(user.email); // Encode special characters
      const response = await axios.put(`http://localhost:5000/users/${encodedEmail}`, { displayName });
  
      console.log("Display name updated:", response.data);
      setIsEditingDisplayName(false);
    } catch (error) {
      console.error("Failed to update display name:", error.response?.data || error.message);
      alert(`Error updating display name: ${error.response?.data?.error || "Unknown error"}`);
    }
  };  

  return (
    <div>
      <nav style={styles.navbar}>
        <div style={styles.titleContainer}>
        <img src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/816ad0d0-6775-4730-b6d6-5e6b86030889/d4mrnap-c6a523c8-691b-4e41-ae4a-ab1c7edd1610.jpg/v1/fill/w_900,h_600,q_75,strp/bubble_stock_by_meganjoy_d4mrnap-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NjAwIiwicGF0aCI6IlwvZlwvODE2YWQwZDAtNjc3NS00NzMwLWI2ZDYtNWU2Yjg2MDMwODg5XC9kNG1ybmFwLWM2YTUyM2M4LTY5MWItNGU0MS1hZTRhLWFiMWM3ZWRkMTYxMC5qcGciLCJ3aWR0aCI6Ijw9OTAwIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmltYWdlLm9wZXJhdGlvbnMiXX0.zMpN-E70aj6pLAANhCCANHavkHnBQ1s7R_1ZnxNBgHs"
              style={styles.logo} alt="Bubble Logo"/>
          <h2 style={styles.title} >Bubble Chat</h2>
    </div>
      </nav>

      {isAuthenticated && (
  <div>
    {isEditingDisplayName ? (
      <div>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter display name"
          style={styles.input}
        />
        <button onClick={handleSaveDisplayName} style={styles.saveButton}>
          Save
        </button>
      </div>
    ) : (
      <p style={styles.welcome}>
        Welcome, {displayName || "Guest"}  
        <button onClick={() => setIsEditingDisplayName(true)} style={styles.editButton}>
          Edit
        </button>
      </p>
    )}
  </div>
  )}

      <div style={styles.roomContainer}>
        <h3 style={styles.niceFont}>Select a Chat Room:</h3>
        <div style={styles.roomGrid}>
          {rooms.map((room) => (
            <button
              key={room._id}
              onClick={() => setSelectedRoom(room.name)}
              style={selectedRoom === room.name ? styles.selectedRoom : styles.roomButton}
            >
              {room.name}
            </button>
          ))}
        </div>

        <div style={styles.addRoomContainer}>
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="New room name"
            style={styles.input}
          />
          <button onClick={handleCreateRoom} style={styles.addButton}>+</button>
        </div>
      </div>

      {selectedRoom ? (
        <Chat isAuthenticated={isAuthenticated} selectedRoom={selectedRoom} />
      ) : (
        <p style={{ textAlign: "center", color: "gray" }}>No rooms available. Create one!</p>
      )}
    </div>
  );
};

const styles = {
  logo: {
    height: "40px",
    width: "55px",
    marginLeft: "20px",
    marginRight: "9px",
    borderRadius: "10px",
  },
  welcome: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: "1.2rem",
    color: "#ffcc00",
    textShadow: "3px 3px 0 #ff5733, 6px 6px 0 #900C3F",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginLeft: "2rem",
    alignItems: "center",
  },
  navbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", backgroundColor: "#dcf1fa", color: "#598aab" },
  titleContainer: { 
    display: "flex", alignItems: "center", fontSize: "2rem",
    background: "linear-gradient(45deg, #1e90ff, #00bfff, #87cefa)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    textShadow: "2px 2px 0 #4682b4, 4px 4px 0 #6495ed",
    letterSpacing: "0.05em",
    marginRight: "auto",
  },
  title: { 
    fontFamily: "'Bungee Shade', sans-serif",
    fontSize: "2.5rem",
    textTransform: "uppercase",
    color: "rgb(32, 88, 144)",
    textShadow: "4px 4px 0px rgba(6, 22, 47, 0.3)",
    letterSpacing: "0.05em",
    marginRight: "auto",
    transition: "transform 0.3s ease",
  },
  input: { padding: "8px", fontSize: "16px", border: "1px solid #598aab", borderRadius: "5px", marginRight: "5px" },
  saveButton: { padding: "5px 10px", backgroundColor: "#598aab", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  editButton: { 
    padding: "6px 10px",
    backgroundColor: "#ccc", 
    border: "none", 
    cursor: "pointer", 
    borderRadius: "12px",
    marginLeft: "15px",
    transition: "background-color 0.3s ease, transform 0.2s ease",
  }, 
  niceFont: {
    fontFamily: "'Jost', sans-serif",
  },
  roomContainer: { textAlign: "center", marginTop: "20px" },
  roomGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", justifyContent: "center", padding: "10px" },
  roomButton: { fontFamily: "'Jost', sans-serif",padding: "10px", borderRadius: "8px", border: "1px solid #598aab", backgroundColor: "#dcf1fa", cursor: "pointer", fontSize: "16px", transition: "0.3s" },
  selectedRoom: { fontFamily: "'Jost', sans-serif",padding: "10px", borderRadius: "8px", border: "1px solid #598aab", backgroundColor: "#598aab", color: "white", cursor: "pointer", fontSize: "16px", transition: "0.3s" },
  addRoomContainer: { marginTop: "15px", display: "flex", justifyContent: "center", alignItems: "center" },
  addButton: { padding: "8px 12px", fontSize: "18px", backgroundColor: "#598aab", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }
};

export default App;
