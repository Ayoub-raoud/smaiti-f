import { createSlice } from '@reduxjs/toolkit';

const getInitialLanguage = () => {
  const savedLang = localStorage.getItem('lang');
  if (savedLang && (savedLang === 'fr' || savedLang === 'ar')) {
    return savedLang;
  }
  return 'fr';
};

const languageSlice = createSlice({
  name: 'language',
  initialState: {
    lang: getInitialLanguage(),
  },
  reducers: {
    setLanguage: (state, action) => {
      state.lang = action.payload;
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;