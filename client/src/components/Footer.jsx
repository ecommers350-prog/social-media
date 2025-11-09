import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Search, PlusSquare, User, PlayCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-sm z-50 md:hidden">
      <nav className="flex justify-around items-center py-3">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center ${
              isActive ? "text-black" : "text-gray-500"
            }`
          }
        >
          <Home size={24} />
          <span className="text-xs">Home</span>
        </NavLink>

        <NavLink
          to="/discover"
          className={({ isActive }) =>
            `flex flex-col items-center ${
              isActive ? "text-black" : "text-gray-500"
            }`
          }
        >
          <Search size={24} />
          <span className="text-xs">Search</span>
        </NavLink>

        <NavLink
          to="/create-post"
          className={({ isActive }) =>
            `flex flex-col items-center ${
              isActive ? "text-black" : "text-gray-500"
            }`
          }
        >
          <PlusSquare size={24} />
          <span className="text-xs">Post</span>
        </NavLink>

        <NavLink
          to="/reels"
          className={({ isActive }) =>
            `flex flex-col items-center ${
              isActive ? "text-black" : "text-gray-500"
            }`
          }
        >
          <PlayCircle size={24} />
          <span className="text-xs">Reels</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center ${
              isActive ? "text-black" : "text-gray-500"
            }`
          }
        >
          <User size={24} />
          <span className="text-xs">Profile</span>
        </NavLink>
      </nav>
    </footer>
  );
};

export default Footer;
