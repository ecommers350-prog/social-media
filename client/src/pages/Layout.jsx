import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Loading from "../components/Loading";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";

const Layout = () => {
  const user = useSelector((state) => state.user.value);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Loading />;

  return (
    <div className="w-full flex min-h-screen">
      {/* Fixed sidebar for md+ screens */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-72">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Mobile sidebar (overlay) when sidebarOpen is true */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          </div>
        </div>
      )}

      {/* Main content; reserve left margin on md+ to avoid being covered by fixed sidebar */}
      <div className="flex-1 bg-slate-50 pb-16 md:ml-72">
        <Outlet />
      </div>

      <Footer /> {/* mobile-only footer (Footer component should use md:hidden so it's hidden on larger screens) */}

      {/* Mobile menu / close buttons (visible only on small screens) */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed top-3 right-3 p-2 z-50 bg-white rounded-md shadow w-10 h-10 flex items-center justify-center md:hidden"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      ) : (
        <button />
      )}
    </div>
  );
};

export default Layout;
