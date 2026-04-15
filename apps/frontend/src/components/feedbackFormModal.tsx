import React, { useState } from 'react';
import { submitFeedback } from '../api/feedbackService';
import styles from './styles';

interface FeedbackFormModalProps {
  show: boolean;
  questionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function FeedbackFormModal({
  show,
  questionId,
  onClose,
  onSuccess,
}: FeedbackFormModalProps) {
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!category || !comment.trim()) {
      setError('Please select a category and enter a comment.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await submitFeedback({
        questionId,
        category,
        comment: comment.trim(),
      });
      setSuccess('Feedback submitted successfully!');
      setComment('');
      setCategory('');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <h3 style={{ marginBottom: '20px' }}>Submit Feedback</h3>

        <label style={styles.modalLabel}>
          Category:
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.modalInput}
          >
            <option value="">Select a category</option>
            <option value="unclear_wording">Unclear Wording</option>
            <option value="wrong_difficulty">Wrong Difficulty</option>
            <option value="insufficient_test_cases">Insufficient Test Cases</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label style={styles.modalLabel}>
          Comment:
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              ...styles.modalInput,
              height: '120px',
              resize: 'vertical' as const,
            }}
            placeholder="Describe the issue with this question..."
          />
        </label>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={handleSubmit}
            style={styles.promoteButton}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
          <button
            onClick={onClose}
            style={{ ...styles.promoteButton, backgroundColor: 'gray' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackFormModal;
