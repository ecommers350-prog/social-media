import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import moment from 'moment'
import { useAuth, useUser } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const RecentMessages = () => {
    const [messages, setMessages] = useState([])
    const {user} = useUser()
    const {getToken} = useAuth()

    const fetchRecentMessages = useCallback(async () => {
        try {
            const token = await getToken()
            const {data} = await api.get('/api/message/recent', {
                headers: {Authorization: `Bearer ${token}`}
            })
            if (data.success) {
                // Group messages by sender and get the latest messages for each sender
                const groupedMessages = data.messages.reduce((acc, message)=>{
                    const senderId = message.from_user_id._id;
                    if (!acc[senderId] || new Date(message.createdAt) > new Date(acc[senderId].createdAt)) {
                        acc[senderId] = message
                    }
                    return acc;
                }, {})

                // Sort messages by date
                const sortedMessages = Object.values(groupedMessages).sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                )

                setMessages(sortedMessages)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message) 
        }
    }, [getToken])

    useEffect(() => {
        if (user) {
            fetchRecentMessages() // Initial fetch
            const interval = setInterval(fetchRecentMessages, 30000) // Fetch every 30 seconds
            return () => clearInterval(interval) // Cleanup
        }
    }, [user, getToken, fetchRecentMessages])

    return (
        <div className='bg-white max-w-xs mt-4 p-4 min-h-20 rounded-md shadow text-xs text-slate-800'>
            <h3 className="font-semibold text-slate-8 mb-4">Recent Messages</h3>
            <div className="flex flex-col max-h-56 overflow-y-scroll no-scrollbar">
                {messages.map((message, index) => (
                    <Link to={`/messages/${message.from_user_id._id}`} key={index} className='flex items-start gap-2 py-2 hover:bg-slate-100'>
                        <img 
                            src={message.from_user_id.profile_picture} 
                            alt="profile" 
                            className='w-8 h-8 rounded-full' 
                        />
                        <div className="w-full">
                            <div className="flex justify-between">
                                <p className="font-medium">{message.from_user_id.full_name}</p>
                                <p className="text-[10px] text-slate-400">
                                    {moment(message.createdAt).fromNow()}
                                </p>
                            </div>
                            <div className="flex justify-between">
                                <p className="text-gray-500">
                                    {message.text ? message.text : 'Media'}
                                </p>
                                {!message.seen && (
                                    <p className='bg-indigo-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[10px]'>
                                        1
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default RecentMessages