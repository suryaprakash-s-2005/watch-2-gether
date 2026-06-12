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
    <div className="absolute bottom-18 left-2 right-2 md:left-auto md:right-full md:mr-3 md:bottom-2 md:w-[325px] h-[340px] md:h-[400px] z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
      <EmojiPickerReact
        theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
        onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
        skinTonesDisabled
        lazyLoadEmojis
        width="100%"
        height="100%"
      />
    </div>
  );
};

export default EmojiPicker;
