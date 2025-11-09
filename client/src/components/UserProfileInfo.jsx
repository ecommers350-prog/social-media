import { Calendar, MapPin, PenBox, Verified } from 'lucide-react'
import React, { useMemo } from 'react'
import moment from 'moment'

const countFollowingUsers = (following) => {
  if (!Array.isArray(following)) return 0

  // Accept common shapes: string IDs or objects with _id/id/userId/targetId
  const ids = following.map(item => {
    if (!item) return null
    if (typeof item === 'string') return item
    if (typeof item === 'object') {
      return (
        item.userId ??
        item._id ??
        item.id ??
        item.targetId ??
        null
      )
    }
    return null
  }).filter(Boolean)

  // de-dupe
  return new Set(ids.map(String)).size
}

const UserProfileInfo = ({ user = {}, posts = [], profileId, setShowEdit }) => {
  const {
    profile_picture,
    full_name,
    username,
    bio,
    location,
    createdAt,
    followers = [],
    following = [],
    verified,
    // If the parent already computed the user-following count, prefer it:
    followingCount,
  } = user

  const safePostsCount = Array.isArray(posts) ? posts.length : 0
  const followersCount = Array.isArray(followers) ? followers.length : 0

  // Derive following users count if not provided by parent
  const followingUsersCount = useMemo(() => {
    if (typeof followingCount === 'number') return followingCount
    return countFollowingUsers(following)
  }, [followingCount, following])

  const joinedLabel = createdAt ? moment(createdAt).fromNow() : 'some time ago'
  const avatar = profile_picture || 'https://ui-avatars.com/api/?name=User&background=ddd&color=555'

  return (
    <div className="relative py-4 px-6 md:px-8 bg-white shadow-md rounded-lg">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="w-32 h-32 border-4 border-white shadow-lg absolute -top-16 rounded-full overflow-hidden">
          <img
            src={avatar}
            className="w-full h-full object-cover"
            alt={`${full_name || 'User'}'s profile`}
          />
        </div>

        <div className="w-full pt-16 md:pt-0 md:pl-36">
          <div className="flex flex-col md:flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {full_name || 'Your Name'}
                </h1>
                {verified ? <Verified className="w-6 h-6 text-blue-500" /> : null}
              </div>
              <p className="text-gray-600">
                {username ? `@${username}` : 'Add a username'}
              </p>
            </div>

            {/* If user is viewing their own profile (no profileId), show Edit */}
            {!profileId && (
              <button
                onClick={() => setShowEdit?.(true)}
                className="cursor-pointer flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors mt-4 md:mt-0"
              >
                <PenBox className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          <p className="text-gray-700 text-sm max-w-md mt-4">{bio || 'Add a short bio'}</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 mt-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {location || 'Add location'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Joined <span className="font-medium">{joinedLabel}</span>
            </span>
          </div>

          <div className="flex items-center gap-6 mt-6 border-t border-gray-300 pt-4">
            <div>
              <span className="sm:text-xl font-bold text-gray-900">{safePostsCount}</span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">Posts</span>
            </div>
            <div>
              <span className="sm:text-xl font-bold text-gray-900">{followersCount}</span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">Followers</span>
            </div>
            <div>
              <span className="sm:text-xl font-bold text-gray-900">{followingUsersCount}</span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">Following</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileInfo
