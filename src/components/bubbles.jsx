import React, { useEffect, useState } from "react";
import "./bubbles.css";

const FloatingBubbles = () => {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    // Create initial bubbles
    const initialBubbles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      size: Math.random() * 40 + 10, // 10px to 50px
      positionX: Math.random() * 100, // 0% to 100%
      positionY: Math.random() * 100, // 0% to 100%
      opacity: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
      animationDuration: Math.random() * 20 + 10, // 10s to 30s
      animationDelay: Math.random() * 5, // 0s to 5s
    }));
    
    setBubbles(initialBubbles);

    // Add a new bubble every 5-10 seconds
    const bubbleInterval = setInterval(() => {
      setBubbles(prev => {
        if (prev.length >= 25) return prev; // Limit number of bubbles
        
        const newBubble = {
          id: Date.now(),
          size: Math.random() * 40 + 10,
          positionX: Math.random() * 100,
          positionY: 100, // Start at bottom
          opacity: Math.random() * 0.5 + 0.1,
          animationDuration: Math.random() * 20 + 10,
          animationDelay: 0,
        };
        
        return [...prev, newBubble];
      });
    }, 5000 + Math.random() * 5000); // 5-10 seconds

    return () => clearInterval(bubbleInterval);
  }, []);

  return (
    <div className="floating-bubbles-container">
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="bubble"
          style={{
            left: `${bubble.positionX}%`,
            bottom: `${bubble.positionY}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            opacity: bubble.opacity,
            animationDuration: `${bubble.animationDuration}s`,
            animationDelay: `${bubble.animationDelay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingBubbles;