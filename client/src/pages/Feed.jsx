import React, { useEffect, useRef, useState } from 'react'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import StoriesBar from '../components/StoriesBar'
import PostCard from '../components/PostCard'
import RecentMessages from '../components/RecentMessages'
import { useAuth } from '@clerk/clerk-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Feed = () => {
  const [feeds, setfeeds] = useState([])
  const [loading, setloading] = useState(true)
  const { getToken } = useAuth()
  const navigate = useNavigate()

  // Gesture state (Instagram-like: swipe LEFT to open messages)
  const containerRef = useRef(null)
  const startRef = useRef({ x: 0, y: 0, t: 0, active: false })
  const [dragX, setDragX] = useState(0) // 0..-80 (negative when dragging left)
  const navigatedRef = useRef(false)

  const fetchFeeds = async () => {
    try {
      setloading(true)
      const { data } = await api.get('/api/post/feed', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      })
      if (data.success) setfeeds(data.posts)
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setloading(false)
    }
  }

  useEffect(() => {
    fetchFeeds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const isMobile = () => window.matchMedia('(max-width: 767px)').matches
    let enabled = isMobile()
    const onResize = () => (enabled = isMobile())

    const THRESHOLD_DIST = 90     // px left distance
    const THRESHOLD_VELOC = 0.6   // px/ms (fast flick)
    const MAX_Y_DRIFT = 50        // px vertical tolerance
    const MAX_DRAG = -80          // content parallax while dragging
    const RESET_MS = 220

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

    const resetDrag = () => setDragX(0)

    const start = (x, y) => {
      startRef.current = { x, y, t: Date.now(), active: true }
      navigatedRef.current = false
    }
    const move = (x, y) => {
      if (!startRef.current.active) return
      const dx = x - startRef.current.x   // negative when moving left
      const dy = y - startRef.current.y
      // cancel if strongly vertical
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > MAX_Y_DRIFT) {
        startRef.current.active = false
        setTimeout(resetDrag, RESET_MS)
        return
      }
      // show a little parallax on left drag only
      if (dx < 0) setDragX(clamp(dx, MAX_DRAG, 0))
      else setDragX(0)
    }
    const end = (x) => {
      if (!startRef.current.active) return
      const dx = x - startRef.current.x
      const dt = Date.now() - startRef.current.t
      const v = Math.abs(dx) / Math.max(dt, 1) // px/ms
      const open = (dx <= -THRESHOLD_DIST) || (dx < 0 && v >= THRESHOLD_VELOC)

      if (open && !navigatedRef.current) {
        navigatedRef.current = true
        // quick snap animation feel
        setDragX(MAX_DRAG)
        // small delay to let the peek register
        setTimeout(() => navigate('/messages'), 80)
      } else {
        // animate back
        setDragX(0)
      }
      startRef.current.active = false
    }

    // TOUCH
    const onTouchStart = (e) => {
      if (!enabled) return
      const t = e.touches[0]
      start(t.clientX, t.clientY)
    }
    const onTouchMove = (e) => {
      if (!enabled || !startRef.current.active) return
      const t = e.touches[0]
      move(t.clientX, t.clientY)
    }
    const onTouchEnd = () => {
      if (!enabled || !startRef.current.active) return
      // use last known X: if we had a move, dragX reflects it
      const lastX = startRef.current.x + dragX
      end(lastX)
    }
    const onTouchCancel = () => {
      startRef.current.active = false
      resetDrag()
    }

    // POINTER (mouse/pen)
    let isDown = false
    const onPointerDown = (e) => {
      if (!enabled) return
      isDown = true
      start(e.clientX, e.clientY)
    }
    const onPointerMove = (e) => {
      if (!enabled || !isDown || !startRef.current.active) return
      move(e.clientX, e.clientY)
    }
    const onPointerUp = (e) => {
      if (!enabled || !isDown) return
      isDown = false
      const lastX = e.clientX
      end(lastX)
    }
    const onPointerCancel = () => {
      isDown = false
      startRef.current.active = false
      resetDrag()
    }

    // Key: ArrowLeft to messages (matches IG’s left gesture)
    const onKeyDown = (e) => {
      if (!enabled) return
      if (e.key === 'ArrowLeft' && !navigatedRef.current) {
        navigatedRef.current = true
        navigate('/messages')
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })

    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    el.addEventListener('pointermove', onPointerMove, { passive: true })
    el.addEventListener('pointerup', onPointerUp, { passive: true })
    el.addEventListener('pointercancel', onPointerCancel, { passive: true })

    el.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)

      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)

      el.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [navigate, dragX])

  return !loading ? (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex items-start justify-center xl:gap-8 outline-none md:transition-none"
      // Parallax translate while dragging (mobile only)
      style={{
        transform: `translateX(${dragX}px)`,
        transition: dragX === 0 ? 'transform 180ms ease-out' : 'none',
        willChange: 'transform',
      }}
      aria-label="Feed. Swipe left to open Messages."
    >
      {/* Mobile top bar with DM icon (tap -> messages) */}
      <div className="md:hidden fixed top-3 right-3 z-20">
        <button
          onClick={() => navigate('/messages')}
          className="rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs shadow"
          aria-label="Open Messages"
        >
          Messages
        </button>
      </div>

      {/* Stories and post list */}
      <div className="flex-grow max-w-[600px]">
        <StoriesBar />
        <div className="p-4 space-y-6">
          {feeds.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      </div>

      {/* Right Sidebar (hidden on small screens) */}
      <div className="max-xl:hidden sticky top-0">
        <div className="max-w-xs bg-white text-xs p-4 rounded-md inline-flex flex-col gap-2 shadow">
          <h3 className="text-slate-800 font-semibold">Sponsored</h3>
          <img src={assets.sponsored_img} className="w-75 h-50 rounded-md" />
          <p className="text-slate-700">Email marketing</p>
          <p className="text-slate-400">
            Supercharge your marketing with a powerful, easy-to-use platform built for results
          </p>
        </div>
        <RecentMessages />
      </div>
    </div>
  ) : (
    <Loading />
  )
}

export default Feed
