import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Contact, PublicUser, UserStatus } from '@isq/shared';

export type SidebarTab = 'contacts' | 'users';

export interface ContactsState {
  items: Contact[];
  activeUin: number | null;
  allUsers: PublicUser[];
  sidebarTab: SidebarTab;
}

const initialState: ContactsState = {
  items: [],
  activeUin: null,
  allUsers: [],
  sidebarTab: 'contacts',
};

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    contactsLoaded(state, action: PayloadAction<Contact[]>) {
      state.items = action.payload;
    },
    contactStatusChanged(state, action: PayloadAction<{ uin: number; status: UserStatus }>) {
      const c = state.items.find((i) => i.uin === action.payload.uin);
      if (c) c.status = action.payload.status;
    },
    selectContact(state, action: PayloadAction<number | null>) {
      state.activeUin = action.payload;
    },
    usersLoaded(state, action: PayloadAction<PublicUser[]>) {
      state.allUsers = action.payload;
    },
    setSidebarTab(state, action: PayloadAction<SidebarTab>) {
      state.sidebarTab = action.payload;
    },
    contactsReset(state) {
      state.items = [];
      state.activeUin = null;
      state.allUsers = [];
      state.sidebarTab = 'contacts';
    },
  },
});

export const {
  contactsLoaded,
  contactStatusChanged,
  selectContact,
  usersLoaded,
  setSidebarTab,
  contactsReset,
} = contactsSlice.actions;
export default contactsSlice.reducer;
