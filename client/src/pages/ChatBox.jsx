import React, { useEffect, useRef, useState } from 'react';
import { ImageIcon, SendHorizonal } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import api from '../api/axios';
import { addMessage, fetchMessages, resetMessages } from '../features/messages/messagesSlice';
import toast from 'react-hot-toast';

const ChatBox = () => {
  const {messages} = useSelector((state) => state.messages);
  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);
  const messageEndRef = useRef(null);

  const connections = useSelector((state) => state.connections.connections);

  const fetchUserMessages = async () => {
    try {
      const token = await getToken();
      await dispatch(fetchMessages({ token, userId }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async () => {
    try {
      if (!text && !image) return;

      const token = await getToken();

      const formData = new FormData();
      formData.append('to_user_id', userId);
      formData.append('text', text);
      if (image) formData.append('image', image);

      const { data } = await api.post('/api/message/send', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setText('');
        setImage(null);
        dispatch(addMessage(data.message));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchUserMessages();
    return () => {
      dispatch(resetMessages());
    };
  }, [userId]);

  useEffect(() => {
    if (connections.length > 0) {
      const foundUser = connections.find((connection) => connection._id === userId);
      setUser(foundUser || null);
    }
  }, [connections, userId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="text-center p-5 text-gray-500">Select a user to start chat</div>;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 md:px-10 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300 shadow-md">
        <img
          src={user.profile_picture}
          className="w-12 h-12 rounded-full"
          alt={`${user.full_name}'s profile`}
        />
        <div>
          <p className="font-medium text-lg text-gray-800">{user.full_name}</p>
          <p className="text-sm text-gray-500 -mt-1">@{user.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="p-5 md:px-10 h-full overflow-y-scroll bg-gray-50">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages
            .slice()
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((message, index) => {
              const isSentByCurrentUser = message.to_user_id === user._id;
              return (
                <div
                  key={index}
                  className={`flex flex-col ${
                    isSentByCurrentUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-2 text-sm max-w-sm bg-white text-slate-700 rounded-lg shadow ${
                      isSentByCurrentUser ? 'rounded-br-none' : 'rounded-bl-none'
                    }`}
                  >
                    {message.message_type === 'image' && (
                      <img
                        src={message.media_url}
                        alt="Sent media"
                        className="w-full max-w-sm rounded-lg mb-1"
                      />
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              );
            })}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4">
        <div className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5">
          <input
            type="text"
            className="flex-1 outline-none text-slate-700"
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            onChange={(e) => setText(e.target.value)}
            value={text}
          />

          <label htmlFor="image">
            {image ? (
              <img src={URL.createObjectURL(image)} className="h-8 rounded" alt="preview" />
            ) : (
              <ImageIcon className="size-7 text-gray-400 cursor-pointer" />
            )}
            <input
              type="file"
              id="image"
              accept="image/*"
              hidden
              onChange={(e) => setImage(e.target.files[0])}
            />
          </label>

          <button
            className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 active:scale-95 cursor-pointer p-2 rounded-full text-white"
            onClick={sendMessage}
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
