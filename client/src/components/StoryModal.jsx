import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/clerk-react'
import { ArrowLeft, Sparkle, TextIcon, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'

const BG_COLORS = [
  '#FFEB3B', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B', '#000000',
  '#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4DD0E1', '#4DB6AC', '#81C784', '#ffffff',
]

const MAX_VIDEO_DURATION = 60 // seconds
const MAX_VIDEO_SIZE_MB = 50 // MB

function getContrastText(hex) {
  // hex like #RRGGBB
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  // sRGB -> linear
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.5 ? '#000000' : '#FFFFFF'
}

const StoryModal = ({ setShowModal, fetchStories }) => {
  const { getToken } = useAuth()

  const [mode, setMode] = useState('text') // 'text' | 'media'
  const [background, setBackground] = useState(BG_COLORS[0])
  const [text, setText] = useState('')
  const [media, setMedia] = useState(null) // File | null
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)

  const dialogRef = useRef(null)

  const textColor = useMemo(() => getContrastText(background), [background])

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Focus the dialog for ESC handling
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const close = () => setShowModal(false)

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) close()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') close()
  }

  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type.startsWith('video')) {
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast.error(`Video file size cannot exceed ${MAX_VIDEO_SIZE_MB} MB.`)
        setMedia(null); setPreviewUrl(null)
        return
      }
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        if (video.duration > MAX_VIDEO_DURATION) {
          toast.error('Video duration cannot exceed 1 minute.')
          setMedia(null); setPreviewUrl(null)
        } else {
          setMedia(file)
          setPreviewUrl(URL.createObjectURL(file))
          setText('')
          setMode('media')
        }
      }
      video.src = URL.createObjectURL(file)
    } else if (file.type.startsWith('image')) {
      setMedia(file)
      setPreviewUrl(URL.createObjectURL(file))
      setText('')
      setMode('media')
    } else {
      toast.error('Unsupported file type.')
    }
  }

  const handleCreateStory = async () => {
    const media_type = mode === 'media' ? (media?.type?.startsWith('image') ? 'image' : 'video') : 'text'

    if (media_type === 'text' && !text.trim()) {
      throw new Error('Please enter some text.')
    }

    const formData = new FormData()
    formData.append('content', text)
    formData.append('media_type', media_type)
    if (media) formData.append('media', media)
    if (media_type === 'text') formData.append('background_color', background)

    const token = await getToken()
    const { data } = await api.post('/api/story/create', formData, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!data?.success) {
      throw new Error(data?.message || 'Failed to create story')
    }

    // success
    fetchStories?.()
    close()
  }

  const onCreateClick = () => {
    setSaving(true)
    toast.promise(
      handleCreateStory(),
      {
        loading: 'Saving...',
        success: 'Story created successfully',
        error: (e) => e?.message || 'Failed to create story',
      }
    ).finally(() => setSaving(false))
  }

  // Content stage (image/video/text) — maintain padding and centering
  const Stage = () => (
    <div
      className="rounded-lg h-96 flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: background }}
    >
      {mode === 'text' && (
        <textarea
          className="bg-transparent w-full h-full p-6 text-lg resize-none focus:outline-none placeholder:opacity-70"
          style={{ color: textColor }}
          placeholder="What's on your mind?"
          onChange={(e) => setText(e.target.value)}
          value={text}
          aria-label="Story text"
        />
      )}
      {mode === 'media' && previewUrl && (
        media?.type?.startsWith('image') ? (
          <img src={previewUrl} alt="Selected media preview" className="max-h-full max-w-full object-contain" />
        ) : (
          <video
            src={previewUrl}
            className="max-h-full max-w-full object-contain"
            muted
            loop
            autoPlay
            playsInline
            controls
          />
        )
      )}
    </div>
  )

  // ------ Render via portal ------
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] min-h-screen bg-black/80 backdrop-blur flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Create a Story"
      onKeyDown={onKeyDown}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md outline-none"
        onMouseDown={(e) => e.stopPropagation()} // prevent close when clicking inside card
      >
        {/* Header */}
        <div className="text-center mb-4 flex items-center justify-between">
          <button onClick={close} className="text-white/90 hover:text-white p-2 cursor-pointer" aria-label="Back">
            <ArrowLeft />
          </button>
          <h2 className="text-lg font-semibold">Create a Story</h2>
          <span className="w-10" />
        </div>

        {/* Stage */}
        <Stage />

        {/* Color picker */}
        <div className="flex mt-4 gap-2 overflow-x-auto pb-1">
          {BG_COLORS.map((color) => (
            <button
              key={color}
              title={color}
              className="w-6 h-6 rounded-full ring-1 ring-white/30 shrink-0"
              style={{ backgroundColor: color, outline: background === color ? '2px solid #fff' : 'none' }}
              onClick={() => { setBackground(color); setMode('text'); setMedia(null); setPreviewUrl(null) }}
              aria-label={`Choose background ${color}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { setMode('text'); setMedia(null); setPreviewUrl(null) }}
            className={`cursor-pointer flex-1 flex items-center justify-center gap-2 p-2 rounded ${mode === 'text' ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}
          >
            <TextIcon size={18} /> Text
          </button>

          <label
            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded cursor-pointer ${mode === 'media' ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}
          >
            <input onChange={handleMediaUpload} type="file" accept="image/*,video/*" className="hidden" />
            <Upload size={18} /> Photo/Video
          </label>
        </div>

        <button
          onClick={onCreateClick}
          disabled={saving}
          className="flex items-center justify-center gap-2 text-white py-3 mt-4 w-full rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition disabled:opacity-60"
        >
          <Sparkle size={18} /> {saving ? 'Saving…' : 'Create Story'}
        </button>
      </div>
    </div>,
    document.body
  )
}

export default StoryModal
