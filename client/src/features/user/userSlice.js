import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios.js";
import toast from "react-hot-toast";

// ✅ Initial state
const initialState = {
  value: null,
  loading: false,
  error: null,
};

// ✅ Fetch user details
export const fetchUser = createAsyncThunk(
  "user/fetchUser",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/user/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        return data.user;
      } else {
        toast.error(data.message || "Failed to fetch user data");
        return rejectWithValue(data.message);
      }
    } catch (error) {
      toast.error("Server error while fetching user data");
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ Update user details
export const updateUser = createAsyncThunk(
  "user/update",
  async ({ userData, token }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/user/update", userData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success(data.message || "Profile updated successfully");
        return data.user;
      } else {
        toast.error(data.message || "Failed to update user");
        return rejectWithValue(data.message);
      }
    } catch (error) {
      toast.error("Server error while updating user");
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ Slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.value = null;
      toast.success("Logged out successfully");
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUser
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.value = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateUser
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.value = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logoutUser } = userSlice.actions;
export default userSlice.reducer;
