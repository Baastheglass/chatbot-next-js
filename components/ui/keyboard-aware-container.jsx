import { useState, useEffect } from "react";


const KeyboardAwareContainer = ({ children, scrollToBottom }) => {
  const [containerHeight, setContainerHeight] = useState('100vh');

  useEffect(() => {
    // Check if visualViewport API is available (most modern mobile browsers)
    if (window.visualViewport) {
      const handleResize = () => {
        // Get the current viewport height
        const height = window.visualViewport.height;
        // Convert to vh units and set the container height
        setContainerHeight(`${height}px`);
      };

      // Add event listeners for both resize and scroll
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('resize', scrollToBottom);
      window.visualViewport.addEventListener('scroll', handleResize);

      // Initial height setup
      handleResize();

      // Cleanup event listeners
      return () => {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('resize', scrollToBottom);
        window.visualViewport.removeEventListener('scroll', handleResize);
      };
    }
  }, []);

  return (
    <div 
      className="w-full overflow-hidden"
      style={{ height: containerHeight }}
    >
      {children}
    </div>
  );
};

export { KeyboardAwareContainer };