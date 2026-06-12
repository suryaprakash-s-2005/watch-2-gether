import EmojiPickerReact, { Theme } from 'emoji-picker-react';

/**
 * Emoji Picker Component Wrapper.
 * Displays a searchable emoji catalog.
 * @param {object} props
 * @param {function} props.onEmojiSelect - Callback when emoji is selected
 * @param {boolean} props.isDarkMode - Theme setting
 */
const EmojiPicker = ({ onEmojiSelect, isDarkMode = true }) => {
  return (
    <div className="absolute bottom-16 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
      <EmojiPickerReact
        theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
        onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
        skinTonesDisabled
        lazyLoadEmojis
        width={310}
        height={380}
      />
    </div>
  );
};

export default EmojiPicker;
