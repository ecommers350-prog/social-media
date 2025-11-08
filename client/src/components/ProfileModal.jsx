import React, { useState } from 'react'
import { Pencil } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux'
import { updateUser } from '../features/user/userSlice';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

const ProfileModal = ({ setShowEdit }) => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const user = useSelector((state) => state.user.value);

  const [editForm, setEditForm] = useState({
    username: user.username || '',
    bio: user.bio || '',
    location: user.location || '',
    full_name: user.full_name || '',
    profile_picture: null,
    cover_photo: null,
  });

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      const userData = new FormData();
      const { full_name, username, bio, location, profile_picture, cover_photo } = editForm;

      userData.append('full_name', full_name);
      userData.append('username', username);
      userData.append('bio', bio);
      userData.append('location', location);
      profile_picture && userData.append('profile', profile_picture);
      cover_photo && userData.append('cover', cover_photo);

      const token = await getToken();

      // Ensure correct content type is handled automatically
      dispatch(updateUser({ userData, token }));

      setShowEdit(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error(error.message || 'Something went wrong while updating your profile.');
    }
  };


return (
    <div className='fixed top-0 bottom-0 left-0 right-0 z-50 h-screen overflow-y-scroll bg-black/50'>
            <div className="max-w-2xl sm:py-6 mx-auto">
                    <div className="bg-white rounded-lg shadow p-6">
                            <h1 className='text-2xl font-bold text-gray-900 mb-6'>Edit Profile</h1>

                            <form className='space-y-4' onSubmit={e=> toast.promise(
                                handleSaveProfile(e), {loading: 'Saving...'}
                            )}>
                                    {/* Profile Picture */}
                                    <div className='flex flex-col items-start gap-3'>
                                            <label htmlFor="profile_picture" className='block text-sm font-medium text-gray-700 mb-1'>
                                                    Profile Picture
                                                    <input hidden type="file" accept='image/*' id='profile_picture' className='w-full p-3 border border-gray-200 rounded-lg' onChange={(e)=>setEditForm({...editForm, profile_picture: e.target.files[0]})} />
                                                    <div className="group/profile relative cursor-pointer">
                                                            <img src={editForm.profile_picture ? URL.createObjectURL(editForm.profile_picture) : user.profile_picture} className='w-24 h-24 rounded-full object-cover mt-2' />
                                                            
                                                            <div className="absolute hidden group-hover/profile:flex top-0 left-0 right-0 bottom-0 bg-black/20 rounded-full items-center justify-center">
                                                                    <Pencil className='w-5 h-5 text-white'/>
                                                            </div>
                                                    </div>
                                            </label>
                                    </div>

                                    {/* Cover Photo */}
                                    <div className="flex flex-col items-start gap-3">
                                            <label htmlFor="cover_photo" className='block text-sm font-medium text-gray-700 mb-1'>
                                                    Cover Photo
                                                    <input hidden type="file" accept='image/*' id='cover_photo' className='w-full p-3 border border-gray-200 rounded-lg mt-2' onChange={(e)=>setEditForm({...editForm, cover_photo: e.target.files[0]})} />
                                                    <div className="group/cover relative cursor-pointer">
                                                            <img src={editForm.cover_photo ? URL.createObjectURL(editForm.cover_photo) : user.cover_photo} className='w-full h-40 rounded-lg object-cover mt-2' />
                                                            <div className='absolute hidden group-hover/cover:flex top-0 left-0 right-0 bottom-0 bg-black/20 rounded-lg items-center justify-center'>
                                                                    <Pencil className='w-5 h-5 text-white'/>
                                                            </div>
                                                    </div>
                                            </label>
                                    </div>
                                    <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                                    Username
                                            </label>
                                            <input type="text" className='w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent' placeholder='Please enter your username' onChange={(e)=>setEditForm({...editForm, username: e.target.value})} value={editForm.username}/>
                                    </div>
                                    <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                                    Name
                                            </label>
                                            <input type="text" className='w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent' placeholder='Please enter your full name' onChange={(e)=>setEditForm({...editForm, full_name: e.target.value})} value={editForm.full_name}/>
                                    </div>
                                    <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                                    Bio
                                            </label>
                                            <textarea rows={3} className='w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent' placeholder='Please enter your bio' onChange={(e)=>setEditForm({...editForm, bio: e.target.value})} value={editForm.bio}/>
                                    </div>
                                    <div>
                                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                                    Location
                                            </label>
                                            <input type="text" className='w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent' placeholder='Please enter your location' onChange={(e)=>setEditForm({...editForm, location: e.target.value})} value={editForm.location}/>
                                    </div>
                                    <div className='flex justify-end space-x-3 pt-6'>
                                            <button type='button' onClick={()=> setShowEdit(false)} className='cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'>Cancel</button>
                                            <button type='submit' className='cursor-pointer px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors'>Save Changes</button>
                                    </div>
                            </form>
                    </div>
            </div>
    </div>
)
}

export default ProfileModal