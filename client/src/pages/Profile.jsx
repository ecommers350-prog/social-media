import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dummyPostsData, dummyUserData } from '../assets/assets'
import Loading from '../components/Loading'
import UserProfileInfo from '../components/UserProfileInfo'
import PostCard from '../components/PostCard'
import { Link } from 'lucide-react'
import moment from 'moment'
import ProfileModal from '../components/ProfileModal'

const Profile = () => {
  const { ProfileId } = useParams()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'about'
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', bio: '' })

  const fetchUser = async (id) => {
    setUser(dummyUserData)
    setPosts(dummyPostsData)
    setEditForm({ name: dummyUserData.name || '', bio: dummyUserData.bio || '' })
  }

  useEffect(() => {
    fetchUser(ProfileId)
  }, [ProfileId])



  if (!user) return <Loading />

  return (
    <div className="relative h-full overflow-y-auto bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div>
            {user.cover_photo ? (
              <img
                src={user.cover_photo}
                alt="cover"
                className="w-full h-56 object-cover"
              />
            ) : (
              <div className="w-full h-56 bg-gradient-to-r from-blue-400 to-purple-500" />
            )}

            {/* User Info */}
            <UserProfileInfo
              user={user}
              posts={posts}
              profileId={ProfileId}
              setShowEdit={setShowEdit}
            />
          </div>

          {/* Tabs */}
          <div className="mt-6 bg-gray-100 pb-8">
            <div className="bg-white rounded-xl shadow p-1 flex max-w-md mx-auto">
              {['posts', 'media', 'likes'].map((tab) => (
                <button
                  onClick={() => setActiveTab(tab)}
                  key={tab}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Posts */}
            {activeTab === 'posts' && (
              <div className="mt-6 flex flex-col items-center gap-6 shadow">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            )}

            {/* Media */}
            {activeTab === 'media' && (
              <div className="flex flex-wrap mt-6 max-w-6xl gap-4 justify-center">
                {posts.flatMap((post) =>
                  (post.image_urls || []).map((image, index) => (
                    <a
                      key={`${post._id}-${index}`}
                      href={image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group w-64 h-40 overflow-hidden rounded-lg"
                    >
                      <img
                        src={image}
                        alt={`media-${index}`}
                        className="w-full h-full object-cover"
                      />
                      <p className="absolute bottom-0 right-0 text-xs p-1 px-3 backdrop-blur-xl text-white opacity-0 group-hover:opacity-100 transition duration-300">
                        Posted {moment(post.createdAt).fromNow()}
                      </p>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Edit profile modal0l,m */}
      {showEdit && <ProfileModal setShowEdit={setShowEdit}/>}
    </div>
  ) 
}

export default Profile