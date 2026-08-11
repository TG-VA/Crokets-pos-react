import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const isTypingTarget = (target) => {
  if (!target) return false;
  
  const tagName = String(target.tagName || "").toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable === true
  );
};

export const useKeyboardShortcuts = (navItems) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignorar si el usuario está escribiendo en un input
      if (isTypingTarget(event.target)) return;

      const item = navItems.find((navItem) => navItem.shortcut === event.key);
      if (!item) return;

      event.preventDefault();
      navigate(item.path);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, navItems]);
};