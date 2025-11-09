// src/components/Footer.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, PlusSquare, PlayCircle } from "lucide-react";
import { UserButton, useUser } from "@clerk/clerk-react";

const LONG_PRESS_MS = 550;

const Footer = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const avatar =
    user?.imageUrl ||
    "https://ui-avatars.com/api/?name=User&background=ddd&color=555";

  // Long-press & menu state (Profile)
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimerRef = useRef(null);
  const profileRef = useRef(null);
  const isProfileActive = pathname.startsWith("/profile");

  // Close menu on outside click or ESC
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => () => clearTimeout(pressTimerRef.current), []);

  const startPress = () => {
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => setMenuOpen(true), LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(pressTimerRef.current);

  const handleProfileClick = () => {
    // If the menu is open from long-press, don't navigate.
    if (menuOpen) return;
    navigate("/profile");
  };

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-sm z-50 md:hidden">
      <nav className="flex justify-around items-center py-3">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center ${isActive ? "text-black" : "text-gray-500"}`
          }
        >
          <Home size={24} />
          <span className="text-xs">Home</span>
        </NavLink>

        <NavLink
          to="/discover"
          className={({ isActive }) =>
            `flex flex-col items-center ${isActive ? "text-black" : "text-gray-500"}`
          }
        >
          <Search size={24} />
          <span className="text-xs">Search</span>
        </NavLink>

        <NavLink
          to="/create-post"
          className={({ isActive }) =>
            `flex flex-col items-center ${isActive ? "text-black" : "text-gray-500"}`
          }
        >
          <PlusSquare size={24} />
          <span className="text-xs">Post</span>
        </NavLink>

        <NavLink
          to="/reels"
          className={({ isActive }) =>
            `flex flex-col items-center ${isActive ? "text-black" : "text-gray-500"}`
          }
        >
          <PlayCircle size={24} />
          <span className="text-xs">Reels</span>
        </NavLink>

        {/* Profile with long-press */}
        <div
          ref={profileRef}
          className={`relative flex flex-col items-center ${
            isProfileActive ? "text-black" : "text-gray-500"
          }`}
        >
          <button
            type="button"
            onClick={handleProfileClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            aria-label="Profile"
            className="focus:outline-none"
          >
            <span className="inline-flex items-center justify-center h-8 w-8 mb-0.5">
              <img
                alt={`${user?.username || user?.fullName || "User"}'s profile picture`}
                src={avatar}
                draggable="false"
                className={`h-6 w-6 rounded-full object-cover border ${
                  isProfileActive ? "border-black ring-2 ring-black/20" : "border-gray-300"
                }`}
              />
            </span>
            <span className="block text-xs">Profile</span>
          </button>

          {/* Long-press: show Clerk UserButton */}
          {menuOpen && (
            <div
              role="menu"
              // high z-index so the Clerk popover (which portals to body) is unobstructed
              className="absolute bottom-12 right-0 translate-y-[-4px] z-[60]"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl border border-gray-200 bg-white shadow-xl p-2">
                <UserButton
                  afterSignOutUrl="/sign-in"
                  signInUrl="/sign-in"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-9 w-9", // slightly larger trigger inside the sheet
                      userButtonPopoverCard: "shadow-2xl border border-gray-200",
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </nav>
    </footer>
  );
};

export default Footer;
