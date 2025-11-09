import { useState } from "react";
import { Image, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]); // array of File
  const [loading, setLoading] = useState(false);

  const user = useSelector((state) => state.user.value);
  const { getToken } = useAuth();

  const handleSubmit = async () => {
    if (loading) return; // prevent double submit
    if (!images.length && !content.trim()) {
      toast.error("Please add at least one image or some text");
      return;
    }

    setLoading(true);

    // decide post type
    const hasImages = images.length > 0;
    const hasText = content.trim().length > 0;
    let postType = "text";
    if (hasImages && hasText) postType = "text_with_image";
    else if (hasImages) postType = "image";

    try {
      const formData = new FormData();
      formData.append("content", content.trim());
      formData.append("post_type", postType);

      // append each file (server should accept multiple 'images' fields)
      images.forEach((file) => {
        formData.append("images", file);
      });

      const token = await getToken();
      const { data } = await api.post("/api/post/add", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // let browser set Content-Type (multipart/form-data with boundary)
        },
      });

      if (data?.success) {
        toast.success("Post added successfully");
        // navigate to feed or refresh; user used navigate('/') before
        navigate("/");
      } else {
        // server responded but something went wrong
        const message = data?.message || "Failed to add post";
        toast.error(message);
      }
    } catch (error) {
      console.error("Create post error:", error);
      toast.error(error?.message || "Something went wrong while creating the post");
    } finally {
      setLoading(false);
    }
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Optionally: validate file size / type here
    setImages((prev) => [...prev, ...files]);
    // reset input value so same files can be chosen again if needed
    e.target.value = null;
  };

  const removeImageAt = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Post</h1>
          <p className="text-slate-600">Share your thoughts with the world</p>
        </div>

        {/* Form */}
        <div className="max-w-xl bg-white p-4 sm:p-8 sm:pb-3 rounded-xl shadow-md space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <img
              src={user?.profile_picture}
              alt={user?.full_name || "avatar"}
              className="w-12 h-12 rounded-full shadow"
            />
            <div>
              <h2 className="font-semibold">{user?.full_name}</h2>
              <p className="text-sm text-gray-500">@{user?.username}</p>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            className="w-full resize-none max-h-40 mt-4 text-sm outline-none placeholder-gray-400 shadow p-3 rounded"
            placeholder="What's happening?"
            onChange={(e) => setContent(e.target.value)}
            value={content}
          />

          {/* Images preview */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {images.map((image, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`preview-${i}`}
                    className="h-20 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImageAt(i)}
                    className="absolute hidden group-hover:flex justify-center items-center top-0 right-0 bottom-0 left-0 bg-black/40 rounded-md cursor-pointer"
                    aria-label="Remove image"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300">
            <label
              htmlFor="images"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer"
            >
              <Image className="w-6 h-6" />
              <input
                type="file"
                id="images"
                accept="image/*"
                hidden
                multiple
                onChange={handleFilesChange}
              />
            </label>

            <button
              disabled={loading}
              onClick={() =>
                toast.promise(handleSubmit(), {
                  loading: "Uploading post...",
                  success: "Post added successfully",
                  error: "Post not added",
                })
              }
              className="text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition text-white font-medium px-8 py-2 rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
