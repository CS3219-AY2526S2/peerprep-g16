import React from 'react';
import styles from './styles';

interface FeedbackTableProps {
  feedbacks: any[];
  questions: any[];
  feedbackError: string;
  feedbackSuccess: string;
  handleResolveFeedback: (id: string) => void;
  handleReviewFeedback: (id: string) => void;
  handleDeleteFeedback: (id: string) => void;
  handleEditQuestionFromFeedback: (feedback: any) => void;
}

function FeedbackTable({
  feedbacks,
  questions,
  feedbackError,
  feedbackSuccess,
  handleResolveFeedback,
  handleReviewFeedback,
  handleDeleteFeedback,
  handleEditQuestionFromFeedback,
}: FeedbackTableProps) {
  const getQuestionDetails = (questionId: string) => {
    return questions.find((q) => q.questionId === questionId);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h3>Question Feedback</h3>
      </div>

      <table style={styles.table}>
        <colgroup>
          <col style={{ width: '16%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '22%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.th}>Question</th>
            <th style={styles.th}>Difficulty</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Comment</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((fb) => {
            const linkedQuestion = getQuestionDetails(fb.questionId);

            return (
              <tr key={fb._id} style={styles.tr}>
                <td style={styles.td}>
                  {linkedQuestion?.title || 'Unknown Question'}
                  <br />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {fb.questionId}
                  </span>
                </td>
                <td style={styles.td}>{linkedQuestion?.difficulty || '-'}</td>
                <td style={styles.td}>{fb.category}</td>
                <td style={styles.td}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{fb.comment}</div>
                  <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>
                    User: {fb.userId}
                  </div>
                </td>
                <td style={styles.td}>{fb.status}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => handleEditQuestionFromFeedback(fb)}
                      style={styles.promoteButton}
                    >
                      Edit Question
                    </button>

                    {fb.status !== 'reviewed' && fb.status !== 'resolved' && (
                      <button
                        onClick={() => handleReviewFeedback(fb._id)}
                        style={{ ...styles.promoteButton, backgroundColor: '#1d4ed8' }}
                      >
                        Mark Reviewed
                      </button>
                    )}

                    {fb.status !== 'resolved' && (
                      <button
                        onClick={() => handleResolveFeedback(fb._id)}
                        style={{ ...styles.promoteButton, backgroundColor: 'green' }}
                      >
                        Mark Resolved
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteFeedback(fb._id)}
                      style={{ ...styles.promoteButton, backgroundColor: 'red' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {feedbackSuccess && (
        <p style={{ color: 'green', marginTop: '10px' }}>{feedbackSuccess}</p>
      )}
      {feedbackError && (
        <p style={{ color: 'red', marginTop: '10px' }}>{feedbackError}</p>
      )}
    </>
  );
}

export default FeedbackTable;
