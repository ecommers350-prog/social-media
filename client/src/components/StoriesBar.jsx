import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import moment from 'moment'
import StoryModal from './StoryModal'
import StoryViewer from './StoryViewer'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const StoriesBar = () => {
  const { getToken } = useAuth()

  const [stories, setStories] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [viewStory, setViewStory] = useState(null)

  const fetchStories = async () => {
    try {
      const token = await getToken()
      const { data } = await api.get('/api/story/get', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      if (data.success) {
        setStories(data.stories)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [getToken]) // Add getToken as dependency since it's used in fetchStories

  return (
    <div className="w-screen sm:w-[calc(100vw-200px)] lg:max-w-xl no-scrollbar overflow-x-auto px-4">
      <div className="flex gap-4 pb-5">
        {/* Add Story Card */}
        <div
          onClick={() => setShowModal(true)}
          className="rounded-lg shadow-sm min-w-[120px] max-w-[160px] max-h-[180px] aspect-[3/4] flex-shrink-0"
          style={{
            border: '2px dashed rgba(99,102,241,0.35)',
            background:
              'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,1) 100%)',
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            cursor: 'pointer',
          }}
        >
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-700 text-center">
              Create Story
            </p>
          </div>
        </div>

        {/* Story Cards */}
        {stories.map((story, index) => (
          <div
            key={index}
            onClick={() => setViewStory(story)}
            className="relative rounded-lg shadow min-w-[120px] max-w-[160px] aspect-[3/4] cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-95 overflow-hidden"
            style={{
              backgroundColor: story.media_type === 'text' ? story.background_color : 'transparent'
            }}
          >
            <img
              src={story.user.profile_picture}
              alt=""
              className="absolute size-8 top-3 left-3 z-10 rounded-full ring ring-gray-100 shadow"
            />
            <p className="absolute top-18 left-3 text-white/90 text-sm truncate max-w-24 z-10">
              {story.content}
            </p>
            <p className="text-white absolute bottom-1 right-2 z-10 text-xs">
              {moment(story.createdAt).fromNow()}
            </p>

            {story.media_type !== 'text' && (
              <div className="absolute inset-0 z-1 rounded-lg overflow-hidden">
                {story.media_type === 'image' ? (
                  <img
                    src={story.media_url}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 hover:scale-110 hover:opacity-90"
                  />
                ) : (
                  <video
                    src={story.media_url}
                    className="h-full w-full object-cover transition duration-500 hover:scale-110 hover:opacity-90"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Story Modal */}
      {showModal && (
        <StoryModal setShowModal={setShowModal} fetchStories={fetchStories} />
      )}

      {/* View Story Modal */}
      {viewStory && (
        <StoryViewer viewStory={viewStory} setViewStory={setViewStory} />
      )}
    </div>
  )
}

export default StoriesBar
