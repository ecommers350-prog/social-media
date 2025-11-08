import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import Loading from '../components/Loading'
import UserCard from '../components/UserCard'
import api from '../api/axios'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { fetchUser } from '../features/user/userSlice'

const Discover = () => {
  const dispatch = useDispatch()
  const [input, setInput] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const { getToken } = useAuth()

  const handleSearch = async (e) => {
    if (e.key === 'Enter') {
      try {
        setLoading(true)
        const token = await getToken()

        const { data } = await api.post(
          '/api/user/discover',
          { input },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (data.success) {
          setUsers(data.users || [])
        } else {
          toast.error(data.message || 'No users found')
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message)
      } finally {
        setLoading(false)
        setInput('')
      }
    }
  }

  useEffect(() => {
    getToken().then((token) => {
      if (token) dispatch(fetchUser(token))
    })
  }, [dispatch, getToken])

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white'>
      <div className='max-w-6xl mx-auto p-6'>
        {/* Title */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Discover People</h1>
          <p className='text-slate-600'>
            Connect with amazing people and grow your network
          </p>
        </div>

        {/* Search Bar */}
        <div className='mb-8 shadow-md rounded-md border border-slate-200/60 bg-white/80'>
          <div className='p-6'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5' />
              <input
                type='text'
                placeholder='Search people by name, username, bio, or location...'
                className='pl-10 sm:pl-12 py-2 w-full border border-gray-300 rounded-md text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyUp={handleSearch}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <Loading height='60vh' />
        ) : users.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {users.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>
        ) : (
          <p className='text-slate-600 text-center mt-10'>
            {input
              ? 'No users found. Try a different search.'
              : 'Start typing to search for users.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default Discover
