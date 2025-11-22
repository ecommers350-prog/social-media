// src/components/ChatBox.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  Mic,
  Image as ImageIconSolid,
  Heart,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import {
  addMessage,
  fetchMessages,
  resetMessages,
} from "../features/messages/messagesSlice";
import toast from "react-hot-toast";

const ChatBox = () => {
  const { messages } = useSelector((s) => s.messages);
  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.user?.value);
  const connections = useSelector((s) => s.connections.connections || []);

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null); // which msg menu is open
  const [replyTo, setReplyTo] = useState(null); // message being replied to in composer
  const messageEndRef = useRef(null);

  // --- time helpers ---
  const startOfDay = (d) => {
    const z = new Date(d);
    z.setHours(0, 0, 0, 0);
    return z.getTime();
  };

  const formatCompact = (when) => {
    const now = Date.now();
    const t = new Date(when).getTime();
    const diff = Math.max(0, now - t);
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const days = Math.floor(hr / 24);

    if (sec < 10) return "Just now";
    if (sec < 60) return `${sec}s`;
    if (min < 60) return `${min}m`;
    if (hr < 24) return `${hr}h`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d`;

    const d = new Date(when);
    const opts = { month: "short", day: "numeric" };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return d.toLocaleDateString(undefined, opts);
  };

  const fullTimeString = (when) => new Date(when).toLocaleString();

  // --- fetch messages ---
  const fetchUserMessages = async () => {
    try {
      const token = await getToken();
      await dispatch(fetchMessages({ token, userId }));
      setTimeout(
        () =>
          messageEndRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        80
      );
    } catch (err) {
      toast.error(err?.message || "Failed to load messages");
    }
  };

  // --- send message ---
  const sendMessage = async () => {
    try {
      if (!text.trim() && !image) return;
      const token = await getToken();
      const formData = new FormData();
      formData.append("to_user_id", userId);
      formData.append("text", text || "");
      if (image) formData.append("image", image);
      if (replyTo?.id) {
        formData.append("replyTo", replyTo.id); // 👈 send reply target id
      }

      const { data } = await api.post("/api/message/send", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data?.success) throw new Error(data?.message || "Send failed");
      dispatch(addMessage(data.message));
      setText("");
      setImage(null);
      setReplyTo(null);
      setTimeout(
        () =>
          messageEndRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        60
      );
    } catch (err) {
      console.error("sendMessage err", err);
      toast.error(err?.message || "Failed to send message");
    }
  };

  // --- delete message ---
  const handleDeleteMessage = async (messageId) => {
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/message/delete",
        { id: messageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data?.success) throw new Error(data?.message || "Delete failed");
      toast.success("Message deleted");
      setOpenMenuId(null);
      // easiest: refetch messages
      await dispatch(fetchMessages({ token, userId }));
    } catch (err) {
      console.error("delete message err", err);
      toast.error(err?.message || "Failed to delete message");
    }
  };

  // --- reply message (open in composer) ---
  const handleReplyMessage = (m) => {
    setReplyTo({
      id: m._id,
      text: m.text || (m.message_type === "image" ? "Photo" : ""),
      isMine:
        String(m.from_user_id || m.from || m.sender_id) ===
        String(currentUser?._id),
    });
    setOpenMenuId(null);
  };

  // --- copy message ---
  const handleCopyMessage = async (m) => {
    try {
      const txt = m.text || (m.message_type === "image" ? m.media_url : "");
      if (!txt) return;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(txt);
      } else {
        const ta = document.createElement("textarea");
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Copied");
      setOpenMenuId(null);
    } catch (err) {
      console.error("copy err", err);
      toast.error("Failed to copy");
    }
  };

  // --- lifecycle ---
  useEffect(() => {
    fetchUserMessages();
    return () => dispatch(resetMessages());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (connections.length > 0) {
      const found = connections.find((c) => String(c._id) === String(userId));
      setUser(found || null);
    }
  }, [connections, userId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!user)
    return (
      <div className="text-center p-6 text-gray-500">
        Select a user to start chat
      </div>
    );

  const otherName = user?.full_name || user?.username || "User";

  // --- render messages with day separators ---
  const renderMessagesWithDays = () => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return (
        <div className="text-center text-sm text-gray-400 py-10">
          No messages yet
        </div>
      );
    }

    const sorted = messages
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let lastDay = null;

    return sorted.map((m, idx) => {
      const when = m.createdAt || Date.now();
      const day = startOfDay(when);
      const showSeparator = day !== lastDay;
      lastDay = day;

      const sentByMe =
        String(m.from_user_id || m.from || m.sender_id) ===
        String(currentUser?._id);

      const msgKey = m._id || `${idx}_${when}`;

      // reply target (object or id)
      let repliedMsg = null;
      if (m.replyTo) {
        if (typeof m.replyTo === "object") {
          repliedMsg = m.replyTo;
        } else {
          repliedMsg = sorted.find(
            (x) => String(x._id) === String(m.replyTo)
          );
        }
      }

      const isImageMsg = m.message_type === "image" && m.media_url;

      const repliedIsMine =
        repliedMsg &&
        String(
          repliedMsg.from_user_id || repliedMsg.from || repliedMsg.sender_id
        ) === String(currentUser?._id);

      return (
        <React.Fragment key={msgKey}>
          {/* Day separator row like IG "Today / Yesterday / May 10" */}
          {showSeparator && (
            <div className="flex justify-center my-3">
              <div className="px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-600 shadow-sm">
                {(() => {
                  const today = startOfDay(Date.now());
                  const yesterday = startOfDay(
                    Date.now() - 24 * 60 * 60 * 1000
                  );
                  if (day === today)
                    return `Today at ${new Date(when).toLocaleTimeString(
                      undefined,
                      { hour: "2-digit", minute: "2-digit" }
                    )}`;
                  if (day === yesterday)
                    return `Yesterday at ${new Date(when).toLocaleTimeString(
                      undefined,
                      { hour: "2-digit", minute: "2-digit" }
                    )}`;
                  const d = new Date(when);
                  const datePart = d.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year:
                      d.getFullYear() !== new Date().getFullYear()
                        ? "numeric"
                        : undefined,
                  });
                  const timePart = d.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return `${datePart} • ${timePart}`;
                })()}
              </div>
            </div>
          )}

          {/* Message row (IG style: small label + bubble + 3-dot + menu + optional reply header) */}
          <div
            className={`px-3 py-1 flex ${
              sentByMe ? "justify-end" : "justify-start"
            }`}
          >
            <div className="max-w-[85%] flex flex-col items-stretch relative">
              {/* "You sent" / username label above bubble */}
              <div className="text-[11px] text-gray-500 mb-1 px-1">
                {sentByMe ? "You sent" : otherName}
              </div>

              {/* Reply header like IG, tagged to the right person */}
              {repliedMsg && (
                <div
                  className={`mb-1 rounded-2xl border px-3 py-2 text-[11px] ${
                    sentByMe
                      ? "bg-slate-50 border-slate-200"
                      : "bg-slate-100 border-slate-200"
                  }`}
                >
                  <div className="font-semibold mb-0.5">
                    {sentByMe
                      ? repliedIsMine
                        ? "You replied to yourself"
                        : `You replied to ${otherName}`
                      : repliedIsMine
                      ? `${otherName} replied to you`
                      : `${otherName} replied`}
                  </div>
                  <div className="flex gap-1">
                    <span className="font-medium">Original message:</span>
                    <span className="line-clamp-2">
                      {repliedMsg.text ||
                        (repliedMsg.message_type === "image"
                          ? "Photo"
                          : "")}
                    </span>
                  </div>
                </div>
              )}

              {/* Bubble itself */}
              <div
                className={`relative inline-block p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${
                  sentByMe
                    ? "bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-br-none"
                    : "bg-white text-slate-800 rounded-bl-none border"
                }`}
                title={fullTimeString(when)}
              >
                {/* IG-style floating 3-dot button */}
                <button
                  className={`
                    absolute top-1/2 -translate-y-1/2
                    ${sentByMe ? "-left-7" : "-right-7"}
                    w-7 h-7
                    rounded-full
                    bg-white shadow-md
                    flex items-center justify-center
                    border border-gray-200
                    hover:bg-gray-100 active:scale-95
                    transition
                    z-10
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((prev) => (prev === msgKey ? null : msgKey));
                  }}
                >
                  <div className="flex flex-col gap-[2px]">
                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                  </div>
                </button>

                {/* Dropdown menu */}
                {openMenuId === msgKey && (
                  <div
                    className={`absolute ${
                      sentByMe ? "top-8 left-0" : "top-8 right-0"
                    } w-32 bg-white text-black rounded-md shadow-lg border text-xs overflow-hidden z-20`}
                  >
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      onClick={() => handleReplyMessage(m)}
                    >
                      Reply
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      onClick={() => handleCopyMessage(m)}
                    >
                      Copy
                    </button>
                    {sentByMe && (
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-500"
                        onClick={() => handleDeleteMessage(m._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}

                {/* Image content */}
                {isImageMsg && (
                  <img
                    src={m.media_url}
                    alt="media"
                    className="w-full rounded-md mb-2 object-cover"
                  />
                )}

                {/* Text content */}
                {m.text && <div>{m.text}</div>}

                {/* Tiny time at bottom-right of bubble (like IG) */}
                <div
                  className={`text-[11px] mt-2 ${
                    sentByMe ? "text-indigo-100/80" : "text-gray-400"
                  } text-right`}
                >
                  {formatCompact(when)}
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  const hasContent = Boolean(text.trim() || image);

  return (
    // mobile: full screen; desktop: fill parent
    <div className="flex flex-col h-screen md:h-full bg-white">
      {/* HEADER */}
      <div
        className="
          flex items-center justify-between px-3 py-2 border-b bg-white shadow-sm cursor-pointer z-30
          fixed top-0 left-0 right-0
          md:fixed md:top-0 md:left-72 md:right-0 md:z-30
        "
        onClick={() => navigate(`/profile/${userId}`)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border"
            />
            {/* online/offline dot */}
            <span
              className={`
                absolute right-0 bottom-0 w-3 h-3 md:w-3.5 md:h-3.5
                rounded-full ring-2 ring-white
                ${user?.isOnline ? "bg-green-500" : "bg-gray-400"}
              `}
            />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm md:text-base truncate">
              {user.full_name}
            </div>
            <div className="text-xs text-gray-500 truncate">@{user.username}</div>
          </div>
        </div>

        <div
          className="flex items-center gap-1 md:gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1.5 md:p-2 rounded-full hover:bg-gray-100"
            title="Audio call"
            onClick={() => toast("Audio call not implemented")}
          >
            <Phone className="w-5 h-5 text-gray-700" />
          </button>
          <button
            className="p-1.5 md:p-2 rounded-full hover:bg-gray-100"
            title="Video call"
            onClick={() => toast("Video call not implemented")}
          >
            <Video className="w-5 h-5 text-gray-700" />
          </button>
          <button
            className="p-1.5 md:p-2 rounded-full hover:bg-gray-100"
            title="Conversation info"
            onClick={() => toast("Info panel not implemented")}
          >
            <Info className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        className="
          flex-1 overflow-y-auto bg-gray-50
          pt-16 pb-24
          md:pt-0 md:pb-0 
        "
      >
        <div className="max-w-3xl mx-auto py-20 space-y-2">
          {renderMessagesWithDays()}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* COMPOSER */}
      <div
        className="
          border-t bg-white px-2 pt-2 pb-2 z-20
          fixed bottom-0 left-0 right-0
          md:fixed md:bottom-0 md:left-72 md:right-0 md:z-20
        "
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-1">
          {/* reply preview (bottom bar, like IG) */}
          {replyTo && (
            <div className="flex items-start justify-between bg-slate-100 border-l-4 border-sky-500 px-3 py-2 rounded-t-xl">
              <div className="text-xs">
                <div className="font-semibold mb-0.5">
                  Replying to{" "}
                  {replyTo.isMine ? "yourself" : otherName}
                </div>
                <div className="line-clamp-2 text-slate-700">
                  {replyTo.text}
                </div>
              </div>
              <button
                className="ml-2 p-1 rounded-full hover:bg-slate-200"
                onClick={() => setReplyTo(null)}
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition"
              onClick={() => toast("Emoji picker not implemented")}
              title="Emoji"
            >
              <Smile className="w-6 h-6 text-gray-700" />
            </button>

            <div className="flex-1 flex items-center bg-gray-50 border rounded-2xl px-3 py-1.5 shadow-sm">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage()
                }
                placeholder="Message..."
                className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-gray-400 min-w-0"
              />

              {image && (
                <div className="mr-2">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="preview"
                    className="h-7 w-7 rounded-md object-cover border"
                  />
                </div>
              )}

              {!hasContent && (
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    className="p-1.5 rounded-full hover:bg-gray-100"
                    onClick={() => toast("Voice message not implemented")}
                    title="Voice clip"
                  >
                    <Mic className="w-5 h-5 text-gray-700" />
                  </button>

                  <label
                    className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                    title="Add photo or video"
                  >
                    <ImageIconSolid className="w-5 h-5 text-gray-700" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setImage(e.target.files?.[0] || null)
                      }
                    />
                  </label>

                  <button
                    className="p-1.5 rounded-full hover:bg-gray-100"
                    onClick={() => toast("Attachment not implemented")}
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5 text-gray-700" />
                  </button>

                  <button
                    className="p-1.5 rounded-full hover:bg-gray-100"
                    onClick={() => toast("Quick like not implemented")}
                    title="Like"
                  >
                    <Heart className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              )}

              {hasContent && (
                <button
                  onClick={sendMessage}
                  className="ml-2 px-1.5 py-1 text-sm font-semibold text-sky-500 hover:text-sky-600 active:scale-95 transition whitespace-nowrap"
                  title="Send"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
