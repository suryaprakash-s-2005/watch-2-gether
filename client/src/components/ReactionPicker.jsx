import { motion } from 'framer-motion';

const SUPPORTED_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

/**
 * Floating quick reaction menu to select supported emojis.
 * @param {object} props
 * @param {function} props.onSelect - Callback with the selected emoji string
 * @param {function} props.onClose - Callback to close the picker overlay
 */
const ReactionPicker = ({ onSelect, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1.5 bg-slate-950/95 border border-slate-800 rounded-full p-1 px-1.5 shadow-2xl backdrop-blur-md z-40"
      onMouseLeave={onClose}
    >
      {SUPPORTED_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="hover:bg-slate-800/80 p-1 rounded-full text-base transition-all duration-200 hover:scale-125 cursor-pointer active:scale-95 flex items-center justify-center"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
};

export default ReactionPicker;
