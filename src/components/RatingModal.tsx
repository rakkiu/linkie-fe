import { useState } from 'react';
import { eventService } from '../services/eventService';

interface RatingModalProps {
  eventId: string;
  onSuccess: () => void;
}

export default function RatingModal({ eventId, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await eventService.submitRating(eventId, rating);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500); // Wait 1.5s then proceed
    } catch (error) {
      console.error('Lỗi khi gửi đánh giá:', error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-[#1a1a2e] rounded-3xl p-8 max-w-sm w-full text-center border border-white/10 shadow-2xl animate-fade-in-up">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Cảm ơn bạn!</h2>
          <p className="text-gray-400 text-sm">Đánh giá của bạn giúp chúng tôi cải thiện sự kiện tốt hơn.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#1a1a2e] rounded-3xl p-8 max-w-sm w-full text-center border border-white/10 shadow-2xl animate-fade-in-up">
        <h2 className="text-2xl font-black text-white mb-2">Đánh giá sự kiện</h2>
        <p className="text-gray-400 text-sm mb-8">Vui lòng đánh giá trải nghiệm của bạn trước khi tiếp tục.</p>

        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              disabled={submitting}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
            >
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill={(hoverRating || rating) >= star ? "#eab308" : "none"}
                stroke={(hoverRating || rating) >= star ? "#eab308" : "#4b5563"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors duration-200"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className={`w-full py-4 rounded-xl font-bold text-white text-[15px] transition-all
            ${rating > 0 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110 active:scale-[0.98]' 
              : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
        >
          {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </div>
    </div>
  );
}
